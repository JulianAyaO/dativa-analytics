import { DatasetId } from '../../dashboards/widgets/widget.models';
import { TransactionRow } from '../../explorer/data/transaction.models';
import { rowFingerprint } from './import-fingerprint';

const STORAGE_KEY = 'dativa.imported';

export interface ImportedStore {
  sales: TransactionRow[];
  orders: TransactionRow[];
}

export function readImportedRows(): ImportedStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { sales: [], orders: [] };
  }
  try {
    const parsed = JSON.parse(raw) as ImportedStore;
    return {
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return { sales: [], orders: [] };
  }
}

export function allImportedRows(): TransactionRow[] {
  const store = readImportedRows();
  return [...store.sales, ...store.orders];
}

export function appendImportedRows(
  dataset: DatasetId,
  rows: TransactionRow[],
  extraExisting: readonly TransactionRow[] = [],
): { added: TransactionRow[]; skipped: number } {
  const store = readImportedRows();
  const seen = new Set(
    [...store[dataset], ...extraExisting.filter((row) => row.dataset === dataset)].map((row) =>
      rowFingerprint(row),
    ),
  );
  const added: TransactionRow[] = [];
  for (const row of rows) {
    const key = rowFingerprint(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    added.push(row);
  }
  if (added.length > 0) {
    store[dataset] = [...store[dataset], ...added];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  return { added, skipped: rows.length - added.length };
}

export function importedDimensionOptions(): {
  region: string[];
  category: string[];
  product: string[];
  seller: string[];
} {
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const rows = allImportedRows();
  return {
    region: unique(rows.map((row) => row.region)),
    category: unique(rows.map((row) => row.category)),
    product: unique(rows.map((row) => row.product)),
    seller: unique(rows.map((row) => row.seller)),
  };
}
