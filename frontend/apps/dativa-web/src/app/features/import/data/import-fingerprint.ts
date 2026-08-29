import { DatasetId } from '../../dashboards/widgets/widget.models';
import { TransactionRow } from '../../explorer/data/transaction.models';

export type ImportDuplicateKind = 'file' | 'existing';

export function rowFingerprint(row: {
  dataset: DatasetId | string;
  occurredAt: string;
  region: string;
  category: string;
  product: string;
  seller: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}): string {
  return [
    row.dataset,
    fingerprintTime(row.occurredAt),
    normalizeImportText(row.region),
    normalizeImportText(row.category),
    normalizeImportText(row.product),
    normalizeImportText(row.seller),
    String(row.quantity),
    money(row.unitPrice),
    money(row.amount),
  ].join('|');
}

export function normalizeImportText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function fingerprintSet(rows: readonly TransactionRow[], dataset?: DatasetId): Set<string> {
  const selected = dataset ? rows.filter((row) => row.dataset === dataset) : rows;
  return new Set(selected.map((row) => rowFingerprint(row)));
}

function fingerprintTime(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) {
    return iso;
  }
  return String(Math.floor(time / 1000));
}

function money(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}
