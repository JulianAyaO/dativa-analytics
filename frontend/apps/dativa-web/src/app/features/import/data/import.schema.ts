import { DatasetId } from '../../dashboards/widgets/widget.models';

export type ImportFieldId =
  | 'occurredAt'
  | 'region'
  | 'category'
  | 'product'
  | 'seller'
  | 'quantity'
  | 'unitPrice'
  | 'amount';

export interface ImportField {
  id: ImportFieldId;
  label: string;
  required: boolean;
  kind: 'date' | 'text' | 'number';
  aliases: readonly string[];
  fallback?: string;
}

export interface ImportSchema {
  dataset: DatasetId;
  name: string;
  description: string;
  fields: readonly ImportField[];
}

export type FieldMapping = Record<ImportFieldId, string>;
export type ColumnMapping = Record<string, ImportFieldId | ''>;

export function emptyFieldMapping(): FieldMapping {
  return {
    occurredAt: '',
    region: '',
    category: '',
    product: '',
    seller: '',
    quantity: '',
    unitPrice: '',
    amount: '',
  };
}

export function emptyColumnMapping(headers: readonly string[]): ColumnMapping {
  return Object.fromEntries(headers.map((header) => [header, ''])) as ColumnMapping;
}

export function suggestFieldMapping(schema: ImportSchema, headers: readonly string[]): FieldMapping {
  return toFieldMapping(suggestColumnMapping(schema, headers));
}

export function suggestColumnMapping(schema: ImportSchema, headers: readonly string[]): ColumnMapping {
  const mapping = emptyColumnMapping(headers);
  const taken = new Set<ImportFieldId>();
  const ranked = headers
    .map((header) => {
      const match = bestField(schema, header, taken);
      return { header, field: match?.field, score: match?.score ?? 0 };
    })
    .filter((item) => item.field && item.score >= 50)
    .sort((left, right) => right.score - left.score);

  for (const item of ranked) {
    const field = item.field;
    if (!field || taken.has(field.id)) {
      continue;
    }
    mapping[item.header] = field.id;
    taken.add(field.id);
  }
  return mapping;
}

export function toFieldMapping(columns: ColumnMapping): FieldMapping {
  const mapping = emptyFieldMapping();
  for (const [header, fieldId] of Object.entries(columns)) {
    if (fieldId && !mapping[fieldId]) {
      mapping[fieldId] = header;
    }
  }
  return mapping;
}

export function missingRequiredFields(schema: ImportSchema, mapping: FieldMapping): string[] {
  return schema.fields.filter((field) => field.required && !mapping[field.id]).map((field) => field.label);
}

export function missingRequiredMessage(schema: ImportSchema, mapping: FieldMapping): string | null {
  const missing = missingRequiredFields(schema, mapping);
  if (missing.length === 0) {
    return null;
  }
  const noun = missing.length === 1 ? 'el campo obligatorio' : 'los campos obligatorios';
  const verb = missing.length === 1 ? 'Falta' : 'Faltan';
  return `No se puede importar este archivo como ${schema.name}. ${verb} ${noun}: ${missing.join(', ')}.`;
}

export function normalizeImportHeader(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function bestField(
  schema: ImportSchema,
  header: string,
  taken: Set<ImportFieldId>,
): { field: ImportField; score: number } | null {
  const normalized = normalizeImportHeader(header);
  let best: { field: ImportField; score: number } | null = null;
  for (const field of schema.fields) {
    if (taken.has(field.id)) {
      continue;
    }
    const score = scoreHeader(normalized, field);
    if (!best || score > best.score) {
      best = { field, score };
    }
  }
  return best;
}

function scoreHeader(normalized: string, field: ImportField): number {
  const label = normalizeImportHeader(field.label);
  if (normalized === label || field.aliases.includes(normalized)) {
    return 100;
  }

  let score = 0;
  for (const alias of [label, ...field.aliases]) {
    if (!alias) {
      continue;
    }
    const shorter = normalized.length <= alias.length ? normalized : alias;
    const longer = normalized.length <= alias.length ? alias : normalized;
    if (shorter.length < 4) {
      continue;
    }
    if (longer.includes(shorter)) {
      score = Math.max(score, 70 + Math.min(shorter.length, 20));
    }
  }
  return score;
}
