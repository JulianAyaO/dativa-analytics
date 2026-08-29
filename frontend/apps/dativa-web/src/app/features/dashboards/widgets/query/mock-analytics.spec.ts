import { createWidget } from '../widget.factory';
import { WidgetType } from '../widget.models';
import { DashboardFilters } from '../../filters/dashboard-filters';
import { toWidgetQuery } from './widget-query.codec';
import { runWidgetQuery } from './mock-analytics';
import { WidgetQuery } from './widget-query.models';

function queryOf(
  type: WidgetType,
  config: Partial<WidgetQuery['config']> = {},
  filters?: Partial<DashboardFilters>,
): WidgetQuery {
  const widget = createWidget(type);
  return toWidgetQuery(
    {
      ...widget,
      config: { ...widget.config, ...config },
    },
    filters,
  );
}

describe('runWidgetQuery', () => {
  it('returns empty for orders in the last 7 days', () => {
    const result = runWidgetQuery(
      queryOf('bar', { dataset: 'orders', period: 'last_7_days', dimension: 'region' }),
    );

    expect(result.status).toBe('empty');
  });

  it('shares series values between line, bar and area', () => {
    const config = {
      dataset: 'sales' as const,
      metric: 'revenue' as const,
      dimension: 'region' as const,
      period: 'last_30_days' as const,
    };

    const line = runWidgetQuery(queryOf('line', config));
    const bar = runWidgetQuery(queryOf('bar', config));
    const area = runWidgetQuery(queryOf('area', config));

    expect(line.status).toBe('ready');
    expect(bar.status).toBe('ready');
    expect(area.status).toBe('ready');

    if (line.status !== 'ready' || bar.status !== 'ready' || area.status !== 'ready') {
      return;
    }

    if (
      line.data.family !== 'series' ||
      bar.data.family !== 'series' ||
      area.data.family !== 'series'
    ) {
      throw new Error('expected series family');
    }

    expect(line.data.variant).toBe('line');
    expect(bar.data.variant).toBe('bar');
    expect(area.data.variant).toBe('area');
    expect(line.data.categories).toEqual(bar.data.categories);
    expect(line.data.series[0]?.values).toEqual(bar.data.series[0]?.values);
    expect(line.data.series[0]?.values).toEqual(area.data.series[0]?.values);
  });

  it('uses the editor period and dimension in the result', () => {
    const months = runWidgetQuery(
      queryOf('line', { dimension: 'month', period: 'last_12_months' }),
    );
    const week = runWidgetQuery(queryOf('line', { dimension: 'month', period: 'last_7_days' }));
    const regions = runWidgetQuery(
      queryOf('table', { dimension: 'region', period: 'last_12_months' }),
    );

    expect(months.status).toBe('ready');
    expect(week.status).toBe('ready');
    expect(regions.status).toBe('ready');

    if (months.status !== 'ready' || week.status !== 'ready' || regions.status !== 'ready') {
      return;
    }

    if (months.data.family !== 'series' || week.data.family !== 'series') {
      throw new Error('expected series');
    }

    expect(months.data.categories).toHaveLength(12);
    expect(week.data.categories).toHaveLength(7);

    if (regions.data.family !== 'table') {
      throw new Error('expected table');
    }

    expect(regions.data.rows).toHaveLength(5);
  });

  it('respects ranking top N and kpi comparison', () => {
    const ranking = runWidgetQuery(
      queryOf('ranking', { dimension: 'seller', topN: 3, period: 'last_12_months' }),
    );
    const kpi = runWidgetQuery(queryOf('kpi', { period: 'last_30_days' }));

    expect(ranking.status).toBe('ready');
    expect(kpi.status).toBe('ready');

    if (ranking.status !== 'ready' || kpi.status !== 'ready') {
      return;
    }

    if (ranking.data.family !== 'ranking' || kpi.data.family !== 'kpi') {
      throw new Error('unexpected family');
    }

    expect(ranking.data.items).toHaveLength(3);
    expect(ranking.data.items[0]?.rank).toBe(1);
    expect(kpi.data.sparkline.values.length).toBeGreaterThan(0);
    expect(kpi.data.changePct).not.toBeNull();
  });

  it('changes measure values when a region filter is applied', () => {
    const open = runWidgetQuery(queryOf('kpi', { period: 'last_12_months' }));
    const filtered = runWidgetQuery(
      queryOf('kpi', { period: 'last_12_months' }, { region: 'Caribe' }),
    );

    expect(open.status).toBe('ready');
    expect(filtered.status).toBe('ready');

    if (open.status !== 'ready' || filtered.status !== 'ready') {
      return;
    }

    if (open.data.family !== 'kpi' || filtered.data.family !== 'kpi') {
      throw new Error('expected kpi');
    }

    expect(filtered.data.value).not.toBe(open.data.value);
    expect(filtered.data.value).toBeLessThan(open.data.value);
  });

  it('collapses a matching dimension to the selected filter value', () => {
    const result = runWidgetQuery(
      queryOf('table', { dimension: 'region', period: 'last_12_months' }, { region: 'Caribe' }),
    );

    expect(result.status).toBe('ready');
    if (result.status !== 'ready' || result.data.family !== 'table') {
      throw new Error('expected table');
    }

    expect(result.data.rows).toHaveLength(1);
    expect(result.data.rows[0]?.label).toBe('Caribe');
  });

  it('uses the global period over the widget period', () => {
    const empty = runWidgetQuery(
      queryOf(
        'bar',
        { dataset: 'orders', period: 'last_12_months', dimension: 'region' },
        { period: 'last_7_days' },
      ),
    );
    const week = runWidgetQuery(
      queryOf('line', { dimension: 'month', period: 'last_12_months' }, { period: 'last_7_days' }),
    );

    expect(empty.status).toBe('empty');
    expect(week.status).toBe('ready');

    if (week.status !== 'ready' || week.data.family !== 'series') {
      return;
    }

    expect(week.data.categories).toHaveLength(7);
  });
});
