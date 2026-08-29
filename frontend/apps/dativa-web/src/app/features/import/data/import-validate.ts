import { TransactionRow } from '../../explorer/data/transaction.models';
import { ImportDuplicateKind, rowFingerprint } from './import-fingerprint';
import { FieldMapping, ImportField, ImportFieldId, ImportSchema, missingRequiredFields, missingRequiredMessage } from './import.schema';
import { ParsedTable, RowIssue } from './import-parse';

export interface ImportRowIssue extends RowIssue {
  kind: 'error' | ImportDuplicateKind;
}

export interface ValidatedImport {
  valid: TransactionRow[];
  issues: ImportRowIssue[];
  duplicates: number;
  duplicatesInFile: number;
  alreadyImported: number;
  missing: string[];
  missingMessage: string | null;
}

export function validateImportTable(
  table: ParsedTable,
  mapping: FieldMapping,
  schema: ImportSchema,
  existing: readonly TransactionRow[] = [],
): ValidatedImport {
  const missing = missingRequiredFields(schema, mapping);
  const missingMessage = missingRequiredMessage(schema, mapping);
  if (missing.length > 0) {
    return {
      valid: [],
      issues: [],
      duplicates: 0,
      duplicatesInFile: 0,
      alreadyImported: 0,
      missing,
      missingMessage,
    };
  }

  const indexes = fieldIndexes(table.headers, mapping, schema);
  const seen = new Set<string>();
  const existingKeys = new Set(
    existing.filter((row) => row.dataset === schema.dataset).map((row) => rowFingerprint(row)),
  );
  const valid: TransactionRow[] = [];
  const issues: ImportRowIssue[] = [];
  let duplicatesInFile = 0;
  let alreadyImported = 0;

  table.rows.forEach((cells, index) => {
    const rowNumber = index + 2;
    try {
      const row = toRow(cells, indexes, schema, index);
      const key = rowFingerprint(row);
      if (existingKeys.has(key)) {
        alreadyImported += 1;
        issues.push({
          row: rowNumber,
          kind: 'existing',
          message: `Esta fila ya existe en ${schema.name}. Se omitirá.`,
        });
        return;
      }
      if (seen.has(key)) {
        duplicatesInFile += 1;
        issues.push({
          row: rowNumber,
          kind: 'file',
          message: `Fila duplicada en el archivo. Se omitirá.`,
        });
        return;
      }
      seen.add(key);
      valid.push(row);
    } catch (error) {
      issues.push({
        row: rowNumber,
        kind: 'error',
        message: error instanceof Error ? error.message : 'Fila inválida',
      });
    }
  });

  return {
    valid,
    issues,
    duplicates: duplicatesInFile + alreadyImported,
    duplicatesInFile,
    alreadyImported,
    missing,
    missingMessage,
  };
}

function fieldIndexes(
  headers: string[],
  mapping: FieldMapping,
  schema: ImportSchema,
): Record<ImportFieldId, number> {
  const indexes = emptyFieldMapping() as Record<ImportFieldId, number>;
  for (const field of schema.fields) {
    indexes[field.id] = mapping[field.id] ? headers.findIndex((header) => header === mapping[field.id]) : -1;
  }
  return indexes;
}

function emptyFieldMapping(): Record<ImportFieldId, number> {
  return {
    occurredAt: -1,
    region: -1,
    category: -1,
    product: -1,
    seller: -1,
    quantity: -1,
    unitPrice: -1,
    amount: -1,
  };
}

function toRow(
  cells: string[],
  indexes: Record<ImportFieldId, number>,
  schema: ImportSchema,
  index: number,
): TransactionRow {
  const field = fieldMap(schema);
  const occurredAt = parseDate(cell(cells, indexes.occurredAt), field.occurredAt.label);
  const region = textValue(cell(cells, indexes.region), field.region);
  const category = textValue(cell(cells, indexes.category), field.category);
  const product = textValue(cell(cells, indexes.product), field.product);
  const seller = textValue(cell(cells, indexes.seller), field.seller);
  const quantity = parseNumber(cell(cells, indexes.quantity), field.quantity.label);
  const amount = parseNumber(cell(cells, indexes.amount), field.amount.label);
  const unitPriceRaw = cell(cells, indexes.unitPrice);
  const unitPrice = unitPriceRaw
    ? parseNumber(unitPriceRaw, field.unitPrice.label)
    : amount / quantity;
  if (quantity <= 0) {
    throw new Error(`${field.quantity.label} debe ser mayor que 0`);
  }
  return {
    id: `imp-${schema.dataset}-${index}-${crypto.randomUUID()}`,
    dataset: schema.dataset,
    occurredAt,
    region,
    category,
    product,
    seller,
    quantity,
    unitPrice: Math.round(unitPrice * 100) / 100,
    amount: Math.round(amount * 100) / 100,
  };
}

function fieldMap(schema: ImportSchema): Record<ImportFieldId, ImportField> {
  return Object.fromEntries(schema.fields.map((field) => [field.id, field])) as Record<ImportFieldId, ImportField>;
}

function cell(cells: string[], index: number): string {
  return index >= 0 ? (cells[index] ?? '').trim() : '';
}

function textValue(value: string, field: ImportField): string {
  if (value) {
    return value;
  }
  if (field.fallback) {
    return field.fallback;
  }
  if (!field.required) {
    return '';
  }
  throw new Error(`${field.label} está vacío`);
}

function parseNumber(value: string, label: string): number {
  const raw = value.trim().replace(/\s/g, '').replace(/^[^\d-]+/, '');
  if (!raw) {
    throw new Error(`${label} no es numérico`);
  }

  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normalized = raw;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const decimals = raw.length - lastComma - 1;
    normalized = decimals === 3 ? raw.replace(/,/g, '') : raw.replace(',', '.');
  }

  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} no es numérico`);
  }
  return number;
}

function parseDate(value: string, label: string): string {
  if (!value) {
    throw new Error(`${label} está vacía`);
  }
  const iso = Date.parse(value);
  if (Number.isFinite(iso)) {
    return new Date(iso).toISOString();
  }
  const parts = value.split(/[/-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const parsed = Date.parse(`${year}-${month}-${day}`);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  throw new Error(`${label} no reconocida`);
}
