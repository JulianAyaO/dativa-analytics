import { familyForWidget } from '../widget.registry';
import { METRIC_OPTIONS, optionLabel } from '../widget.schema';
import { WidgetQuery, WidgetResult } from './widget-query.models';
import { allImportedRows } from '../../../import/data/imported-store';
import { TransactionRow } from '../../../explorer/data/transaction.models';
import { effectivePeriod, emptyFilters, matchesDimensionFilter } from '../../filters/dashboard-filters';
import { periodRangeUtc } from '../../../../core/realtime/sale-created';
import { MOCK_ANALYTICS_AS_OF } from './mock-analytics';

export function withImportedOverlay(result: WidgetResult, query: WidgetQuery): WidgetResult {
  const extra = overlayTotal(query);
  if (extra <= 0) {
    return result;
  }

  if (result.status !== 'ready') {
    return overlayReady(query, extra);
  }

  const data = result.data;
  if (data.family === 'kpi') {
    const value = data.value + extra;
    return {
      ...result,
      data: {
        ...data,
        value,
        changePct: data.previous === 0 ? null : (value - data.previous) / data.previous,
      },
    };
  }
  if (data.family === 'progress') {
    const value = data.value + extra;
    return { ...result, data: { ...data, value, ratio: data.target === 0 ? 0 : value / data.target } };
  }
  if (data.family === 'series' && data.series[0]) {
    const values = [...data.series[0].values];
    values[values.length - 1] = (values[values.length - 1] ?? 0) + extra;
    return {
      ...result,
      data: {
        ...data,
        series: data.series.map((series, index) =>
          index === 0 ? { ...series, values } : series,
        ),
      },
    };
  }
  return result;
}

function overlayReady(query: WidgetQuery, value: number): WidgetResult {
  const family = familyForWidget(query.type);
  const label = optionLabel(METRIC_OPTIONS, query.config.metric);
  return {
    status: 'ready',
    query,
    family,
    data:
      family === 'kpi'
        ? {
            family: 'kpi',
            value,
            previous: 0,
            changePct: null,
            sparkline: { categories: [{ key: 'import', label: 'Importado' }], values: [value] },
          }
        : family === 'progress'
          ? { family: 'progress', value, target: value, ratio: 1 }
          : family === 'ranking'
            ? {
                family: 'ranking',
                items: [{ rank: 1, key: 'import', label: 'Importado', value, share: 1 }],
              }
            : family === 'composition'
              ? {
                  family: 'composition',
                  total: value,
                  slices: [{ key: 'import', label: 'Importado', value }],
                }
              : family === 'table'
                ? {
                    family: 'table',
                    dimensionLabel: 'Importado',
                    metricLabel: label,
                    rows: [{ key: 'import', label: 'Importado', value, share: 1 }],
                  }
                : {
                    family: 'series',
                    variant: query.type === 'bar' ? 'bar' : query.type === 'area' ? 'area' : 'line',
                    categories: [{ key: 'import', label: 'Importado' }],
                    series: [{ id: 'current', label: 'Periodo actual', values: [value] }],
                  },
  };
}

function overlayTotal(query: WidgetQuery): number {
  const rows = matchingImported(query);
  if (rows.length === 0) {
    return 0;
  }
  const metric = query.config.metric;
  if (metric === 'units') {
    return rows.reduce((sum, row) => sum + row.quantity, 0);
  }
  if (metric === 'orders') {
    return rows.length;
  }
  if (metric === 'avg_ticket') {
    return rows.reduce((sum, row) => sum + row.amount, 0) / rows.length;
  }
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

function matchingImported(query: WidgetQuery): TransactionRow[] {
  const filters = query.filters ?? emptyFilters();
  const period = effectivePeriod(query.config.period, filters);
  const now = Date.parse(`${MOCK_ANALYTICS_AS_OF}T00:00:00.000Z`) || Date.now();
  const range = periodRangeUtc(period, now);
  return allImportedRows().filter((row) => {
    if (row.dataset !== query.config.dataset) {
      return false;
    }
    const time = Date.parse(row.occurredAt);
    if (!Number.isFinite(time) || time < range.from || time >= range.to) {
      return false;
    }
    if (!matchesDimensionFilter(filters.region, row.region)) {
      return false;
    }
    if (!matchesDimensionFilter(filters.category, row.category)) {
      return false;
    }
    if (!matchesDimensionFilter(filters.product, row.product)) {
      return false;
    }
    if (!matchesDimensionFilter(filters.seller, row.seller)) {
      return false;
    }
    return true;
  });
}
