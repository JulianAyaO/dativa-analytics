import { createWidget } from '../dashboards/widgets/widget.factory';
import { emptyFilters, normalizeFilters } from '../dashboards/filters/dashboard-filters';
import {
  explorerQueryParams,
  rankingExplorerExtra,
  toExplorerQuery,
} from './explorer-query';

describe('explorer query', () => {
  it('carries the widget dataset and the effective period', () => {
    const widget = createWidget('kpi');
    const query = toExplorerQuery(widget, emptyFilters());

    expect(query.dataset).toBe('sales');
    expect(query.period).toBe('last_12_months');
    expect(explorerQueryParams(query)).toEqual({
      dataset: 'sales',
      period: 'last_12_months',
    });
  });

  it('keeps dashboard filters and lets a ranking click override its dimension', () => {
    const widget = createWidget('ranking');
    widget.config.dimension = 'region';
    const query = toExplorerQuery(
      widget,
      normalizeFilters({ period: 'last_30_days', seller: 'Ana Pérez' }),
      rankingExplorerExtra('region', 'Caribe'),
    );

    expect(query.period).toBe('last_30_days');
    expect(query.seller).toBe('Ana Pérez');
    expect(query.region).toBe('Caribe');
    expect(explorerQueryParams(query)['region']).toBe('Caribe');
  });

  it('does not turn a month ranking click into a dimension filter', () => {
    expect(rankingExplorerExtra('month', 'ago 26')).toEqual({});
  });
});
