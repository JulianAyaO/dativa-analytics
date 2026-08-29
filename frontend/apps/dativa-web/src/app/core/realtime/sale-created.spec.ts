import { createWidget } from '../../features/dashboards/widgets/widget.factory';
import { toWidgetQuery } from '../../features/dashboards/widgets/query/widget-query.codec';
import { emptyFilters, normalizeFilters } from '../../features/dashboards/filters/dashboard-filters';
import {
  parseSaleCreated,
  periodRangeUtc,
  isSyntheticLiveSale,
  saleAffectsExplorer,
  saleAffectsQuery,
} from './sale-created';
import { mockSale } from './mock-realtime.transport';

const NOW = Date.UTC(2026, 7, 24, 12);

describe('sale created', () => {
  it('parses a small typed payload and rejects unknown events', () => {
    const sale = parseSaleCreated({
      type: 'SaleCreated',
      id: 'tx-1',
      dataset: 'sales',
      occurredAt: '2026-08-24T12:00:00.000Z',
      region: 'Caribe',
      category: 'Electrnica',
      product: 'Auriculares',
      seller: 'Ana Prez',
      quantity: 2,
      amount: 40,
    });

    expect(sale?.id).toBe('tx-1');
    expect(parseSaleCreated({ type: 'AlertRaised' })).toBeNull();
  });

  it('invalidates only widgets whose dataset, period and filters match', () => {
    const widget = createWidget('bar');
    const matching = toWidgetQuery(widget, emptyFilters());
    const caribe = toWidgetQuery(widget, normalizeFilters({ region: 'Caribe' }));
    const sale = mockSale(0, NOW);

    expect(saleAffectsQuery(sale, matching, NOW)).toBe(true);
    expect(saleAffectsQuery({ ...sale, dataset: 'orders' }, matching, NOW)).toBe(false);
    expect(saleAffectsQuery({ ...sale, region: 'Amazona' }, caribe, NOW)).toBe(false);
    expect(saleAffectsQuery({ ...sale, region: 'Caribe' }, caribe, NOW)).toBe(true);
  });

  it('keeps explorer tables stable unless the sale belongs to the current query', () => {
    const sale = {
      ...mockSale(2, NOW),
      id: 'tx-imported-2',
    };
    expect(saleAffectsExplorer(sale, 'sales', emptyFilters(), '', NOW)).toBe(true);
    expect(saleAffectsExplorer(sale, 'orders', emptyFilters(), '', NOW)).toBe(false);
    expect(
      saleAffectsExplorer(sale, 'sales', normalizeFilters({ period: 'last_7_days' }), 'no-match', NOW),
    ).toBe(false);
    expect(isSyntheticLiveSale(mockSale(2, NOW))).toBe(true);
    expect(saleAffectsExplorer(mockSale(2, NOW), 'sales', emptyFilters(), '', NOW)).toBe(false);
  });

  it('uses UTC period windows compatible with the backend', () => {
    const range = periodRangeUtc('last_7_days', NOW);
    expect(range.from).toBe(Date.UTC(2026, 7, 18));
    expect(range.to).toBe(Date.UTC(2026, 7, 25));
  });
});
