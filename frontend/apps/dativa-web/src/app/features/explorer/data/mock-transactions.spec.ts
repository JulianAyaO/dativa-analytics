import { emptyFilters, normalizeFilters } from '../../dashboards/filters/dashboard-filters';
import { DEFAULT_EXPLORER_COLUMNS } from '../explorer-columns';
import { mockTransactionExport, mockTransactionPage } from './mock-transactions';
import { TransactionListQuery } from './transaction.models';

function query(overrides: Partial<TransactionListQuery> = {}): TransactionListQuery {
  return {
    dataset: 'sales',
    filters: emptyFilters(),
    search: '',
    sort: 'occurredAt',
    dir: 'desc',
    page: 0,
    size: 50,
    columns: [...DEFAULT_EXPLORER_COLUMNS],
    ...overrides,
  };
}

describe('mock transactions', () => {
  it('pages, sorts and filters on the server-side contract', () => {
    const page = mockTransactionPage(
      query({
        filters: normalizeFilters({ period: 'last_12_months', region: 'Caribe' }),
        sort: 'amount',
        dir: 'desc',
        size: 10,
      }),
    );

    expect(page.items.length).toBeLessThanOrEqual(10);
    expect(page.size).toBe(10);
    expect(page.totalElements).toBeGreaterThan(page.items.length);
    expect(page.items.every((row) => row.region === 'Caribe')).toBe(true);
    expect(page.items[0]?.amount ?? 0).toBeGreaterThanOrEqual(page.items.at(-1)?.amount ?? 0);
  });

  it('returns no orders in the last 7 days', () => {
    const page = mockTransactionPage(
      query({
        dataset: 'orders',
        filters: normalizeFilters({ period: 'last_7_days' }),
      }),
    );

    expect(page.totalElements).toBe(0);
    expect(page.items).toEqual([]);
  });

  it('searches across visible dimensions and exports the current filter', () => {
    const filtered = mockTransactionPage(query({ search: 'Caribe' }));
    expect(filtered.totalElements).toBeGreaterThan(0);
    expect(
      filtered.items.every((row) =>
        [row.region, row.category, row.product, row.seller].some((value) =>
          value.toLowerCase().includes('caribe'),
        ),
      ),
    ).toBe(true);

    const exported = mockTransactionExport(query({ search: 'Caribe' }));
    expect(exported.length).toBe(filtered.totalElements);
  });
});
