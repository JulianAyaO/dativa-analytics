import { MOCK_DIMENSIONS } from '../../dashboards/widgets/query/mock-analytics';
import { DatasetId } from '../../dashboards/widgets/widget.models';
import { allImportedRows } from '../../import/data/imported-store';
import { effectivePeriod, matchesDimensionFilter } from '../../dashboards/filters/dashboard-filters';
import { ExplorerColumnId } from '../explorer-columns';
import { TransactionListQuery, TransactionPage, TransactionRow } from './transaction.models';

const PAGE_AS_OF = Date.UTC(2026, 7, 24);

export function mockTransactionPage(query: TransactionListQuery): TransactionPage {
  const rows = mockTransactionRows()
    .filter((row) => matchesQuery(row, query))
    .sort((left, right) => compareRows(left, right, query.sort, query.dir));

  const start = query.page * query.size;
  const items = rows.slice(start, start + query.size);

  return {
    items,
    page: query.page,
    size: query.size,
    totalElements: rows.length,
    totalPages: query.size === 0 ? 0 : Math.ceil(rows.length / query.size),
  };
}

export function mockTransactionExport(query: TransactionListQuery, ids?: string[]): TransactionRow[] {
  const selected = new Set(ids ?? []);
  return mockTransactionRows()
    .filter((row) => (selected.size > 0 ? selected.has(row.id) : matchesQuery(row, query)))
    .sort((left, right) => compareRows(left, right, query.sort, query.dir))
    .slice(0, 5_000);
}

function matchesQuery(row: TransactionRow, query: TransactionListQuery): boolean {
  if (row.dataset !== query.dataset) {
    return false;
  }

  const period = effectivePeriod('last_12_months', query.filters);
  const time = Date.parse(row.occurredAt);
  const { from, to } = periodRange(period);
  if (time < from || time >= to) {
    return false;
  }

  if (!matchesDimensionFilter(query.filters.region, row.region)) {
    return false;
  }
  if (!matchesDimensionFilter(query.filters.category, row.category)) {
    return false;
  }
  if (!matchesDimensionFilter(query.filters.product, row.product)) {
    return false;
  }
  if (!matchesDimensionFilter(query.filters.seller, row.seller)) {
    return false;
  }

  const search = query.search.trim().toLowerCase();
  if (!search) {
    return true;
  }

  return [row.region, row.category, row.product, row.seller].some((value) =>
    value.toLowerCase().includes(search),
  );
}

function compareRows(
  left: TransactionRow,
  right: TransactionRow,
  sort: ExplorerColumnId,
  dir: 'asc' | 'desc',
): number {
  const sign = dir === 'asc' ? 1 : -1;
  const av = left[sort];
  const bv = right[sort];
  if (typeof av === 'number' && typeof bv === 'number') {
    return (av - bv) * sign;
  }
  return String(av).localeCompare(String(bv), 'es') * sign || left.id.localeCompare(right.id);
}

function periodRange(period: 'last_7_days' | 'last_30_days' | 'last_12_months'): {
  from: number;
  to: number;
} {
  const today = new Date(PAGE_AS_OF);
  if (period === 'last_7_days') {
    const from = new Date(PAGE_AS_OF);
    from.setUTCDate(from.getUTCDate() - 6);
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(PAGE_AS_OF);
    to.setUTCDate(to.getUTCDate() + 1);
    to.setUTCHours(0, 0, 0, 0);
    return { from: from.getTime(), to: to.getTime() };
  }
  if (period === 'last_30_days') {
    const from = new Date(PAGE_AS_OF);
    from.setUTCDate(from.getUTCDate() - 29);
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(PAGE_AS_OF);
    to.setUTCDate(to.getUTCDate() + 1);
    to.setUTCHours(0, 0, 0, 0);
    return { from: from.getTime(), to: to.getTime() };
  }

  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return { from: from.getTime(), to: to.getTime() };
}

export function existingRowsForImport(dataset: DatasetId): TransactionRow[] {
  return mockTransactionRows().filter((row) => row.dataset === dataset);
}

function mockTransactionRows(): TransactionRow[] {
  const seeded: TransactionRow[] = [];
  const regions = MOCK_DIMENSIONS.REGIONS;
  const categories = MOCK_DIMENSIONS.CATEGORIES;
  const products = MOCK_DIMENSIONS.PRODUCTS;
  const sellers = MOCK_DIMENSIONS.SELLERS;

  for (let index = 0; index < 180; index += 1) {
    const dataset = index % 6 === 0 ? 'orders' : 'sales';
    const dayOffset = dataset === 'orders' ? 8 + (index % 320) : index % 340;
    const date = new Date(PAGE_AS_OF);
    date.setUTCDate(date.getUTCDate() - dayOffset);
    date.setUTCHours(9 + (index % 8), index % 60, 0, 0);
    const product = products[index % products.length] ?? products[0];
    const quantity = 1 + (index % 4);
    const unitPrice = 48_500 + (index % 9) * 18_500;

    seeded.push({
      id: `tx-${index.toString().padStart(4, '0')}`,
      dataset,
      occurredAt: date.toISOString(),
      region: regions[(index + 2) % regions.length] ?? 'Caribe',
      category: categories[(index + 1) % categories.length] ?? 'Electrónica',
      product,
      seller: sellers[(index + 3) % sellers.length] ?? 'Ana Pérez',
      quantity,
      unitPrice,
      amount: unitPrice * quantity,
    });
  }

  return [...seeded, ...allImportedRows()];
}
