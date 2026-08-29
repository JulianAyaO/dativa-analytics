import {
  DashboardFilters,
  effectivePeriod,
  emptyFilters,
  splitFilterValues,
} from '../../filters/dashboard-filters';
import { DatasetId, DimensionId, MetricId, WidgetType } from '../widget.models';
import { familyForWidget } from '../widget.registry';
import { optionLabel, DIMENSION_OPTIONS, METRIC_OPTIONS } from '../widget.schema';
import { WidgetCategory, WidgetQuery, WidgetResult } from './widget-query.models';

const AS_OF = Date.UTC(2026, 7, 24);
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const SEASON = [0.82, 0.78, 0.9, 0.95, 1, 1.05, 0.98, 0.92, 1.02, 1.08, 1.22, 1.35];

const REGIONS = ['Caribe', 'Andina', 'Pacífica', 'Orinoquía', 'Amazonía'];
const CATEGORIES = ['Electrónica', 'Hogar', 'Moda', 'Alimentos', 'Accesorios'];
const PRODUCTS = [
  'Monitor 27"',
  'Portátil 14"',
  'Auriculares',
  'Sofá 3 plazas',
  'Lámpara LED',
  'Chaqueta',
  'Zapatillas',
  'Café premium',
  'Aceite de oliva',
  'Mochila urbana',
];
const SELLERS = [
  'Ana Pérez',
  'Carlos Ruiz',
  'Lucía Gómez',
  'Diego Soto',
  'Marta Vidal',
  'Jorge Núñez',
];

const BASE: Record<DatasetId, { revenue: number; units: number; orders: number }> = {
  sales: { revenue: 77_280_000, units: 126, orders: 52 },
  orders: { revenue: 38_220_000, units: 74, orders: 39 },
};

export function runWidgetQuery(query: WidgetQuery): WidgetResult {
  const family = familyForWidget(query.type);
  const period = queryPeriod(query);

  if (query.config.dataset === 'orders' && period === 'last_7_days') {
    return { status: 'empty', query, family };
  }

  const categories = categoriesFor(query);
  const current = categories.map((category, index) =>
    measure(query, category.key, index, categories.length, 'current'),
  );
  const previous = categories.map((category, index) =>
    measure(query, category.key, index, categories.length, 'previous'),
  );

  const currentValues = current.map((item) => pickMetric(item, query.config.metric));
  const previousValues = previous.map((item) => pickMetric(item, query.config.metric));
  const total = sum(currentValues);
  const previousTotal = sum(previousValues);

  if (total <= 0) {
    return { status: 'empty', query, family };
  }

  const data = buildData(query, family, categories, currentValues, previousValues, total, previousTotal);
  return { status: 'ready', query, family, data };
}

function buildData(
  query: WidgetQuery,
  family: ReturnType<typeof familyForWidget>,
  categories: WidgetCategory[],
  currentValues: number[],
  previousValues: number[],
  total: number,
  previousTotal: number,
): NonNullable<Extract<WidgetResult, { status: 'ready' }>['data']> {
  const metricLabel = optionLabel(METRIC_OPTIONS, query.config.metric);
  const rows = rankedRows(categories, currentValues, total);

  switch (family) {
    case 'kpi':
      return {
        family,
        value: total,
        previous: previousTotal,
        changePct: previousTotal === 0 ? null : (total - previousTotal) / previousTotal,
        sparkline: {
          categories: timeCategories(queryPeriod(query)),
          values: sparklineValues(query),
        },
      };
    case 'series':
      return {
        family,
        variant: seriesVariant(query.type),
        categories,
        series: [
          { id: 'current', label: 'Periodo actual', values: currentValues },
          { id: 'previous', label: 'Periodo anterior', values: previousValues },
        ],
      };
    case 'composition':
      return {
        family,
        total,
        slices: rows.map((row) => ({ key: row.key, label: row.label, value: row.value })),
      };
    case 'table':
      return {
        family,
        dimensionLabel: optionLabel(
          DIMENSION_OPTIONS,
          query.config.dimension ?? 'month',
        ),
        metricLabel,
        rows,
      };
    case 'ranking': {
      const topN = query.config.topN ?? 5;
      return {
        family,
        items: rows.slice(0, topN).map((row, index) => ({
          rank: index + 1,
          key: row.key,
          label: row.label,
          value: row.value,
          share: row.share,
        })),
      };
    }
    case 'progress': {
      const target = niceTarget(previousTotal);
      return {
        family,
        value: total,
        target,
        ratio: target === 0 ? 0 : total / target,
      };
    }
  }
}

function categoriesFor(query: WidgetQuery): WidgetCategory[] {
  const dimension: DimensionId = query.config.dimension ?? 'month';
  const period = queryPeriod(query);
  const selected = matchingFilter(dimension, queryFilters(query));

  if (dimension === 'month') {
    return timeCategories(period);
  }

  if (selected) {
    return splitFilterValues(selected).map((label) => ({ key: label, label }));
  }

  const values =
    dimension === 'region'
      ? REGIONS
      : dimension === 'category'
        ? CATEGORIES
        : dimension === 'product'
          ? PRODUCTS
          : SELLERS;

  return values.map((label) => ({ key: label, label }));
}

function timeCategories(period: NonNullable<WidgetQuery['config']['period']>): WidgetCategory[] {
  if (period === 'last_12_months') {
    return Array.from({ length: 12 }, (_, offset) => {
      const date = new Date(AS_OF);
      date.setUTCMonth(date.getUTCMonth() - (11 - offset), 1);
      return {
        key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
        label: `${MONTHS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`,
      };
    });
  }

  const days = period === 'last_7_days' ? 7 : 30;
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(AS_OF);
    date.setUTCDate(date.getUTCDate() - (days - 1 - offset));
    return {
      key: date.toISOString().slice(0, 10),
      label: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`,
    };
  });
}

function sparklineValues(query: WidgetQuery): number[] {
  const categories = timeCategories(queryPeriod(query));
  return categories.map((category, index) =>
    pickMetric(measure(query, category.key, index, categories.length, 'current'), query.config.metric),
  );
}

function measure(
  query: WidgetQuery,
  key: string,
  index: number,
  count: number,
  frame: 'current' | 'previous',
): { revenue: number; units: number; orders: number } {
  const period = queryPeriod(query);
  const filters = queryFilters(query);
  const rng = mulberry32(
    hash(`${query.config.dataset}|${key}|${period}|${filterFingerprint(filters)}|${frame}`),
  );
  const season = seasonality(index, count, period);
  const datasetBias = query.config.dataset === 'sales' ? 1 : 0.72;
  const frameBias = frame === 'current' ? 1 : 0.91;
  const noise = 0.78 + rng() * 0.44;
  const keyBias = 0.7 + (hash(key) % 50) / 100;
  const base = BASE[query.config.dataset];
  const scale = datasetBias * frameBias * season * noise * keyBias * filterScale(query);

  return {
    revenue: roundTo(base.revenue * scale, 0),
    units: Math.max(1, Math.round(base.units * scale)),
    orders: Math.max(1, Math.round(base.orders * scale)),
  };
}

function pickMetric(
  measures: { revenue: number; units: number; orders: number },
  metric: MetricId,
): number {
  if (metric === 'revenue') {
    return measures.revenue;
  }

  if (metric === 'units') {
    return measures.units;
  }

  if (metric === 'orders') {
    return measures.orders;
  }

  return measures.orders === 0 ? 0 : measures.revenue / measures.orders;
}

function rankedRows(
  categories: WidgetCategory[],
  values: number[],
  total: number,
): Array<WidgetCategory & { value: number; share: number }> {
  return categories
    .map((category, index) => ({
      ...category,
      value: values[index] ?? 0,
      share: total === 0 ? 0 : (values[index] ?? 0) / total,
    }))
    .sort((a, b) => b.value - a.value);
}

function seriesVariant(type: WidgetType): 'line' | 'bar' | 'area' {
  if (type === 'bar') {
    return 'bar';
  }

  if (type === 'area') {
    return 'area';
  }

  return 'line';
}

function seasonality(
  index: number,
  count: number,
  period: NonNullable<WidgetQuery['config']['period']>,
): number {
  if (period === 'last_12_months') {
    const date = new Date(AS_OF);
    date.setUTCMonth(date.getUTCMonth() - (11 - index), 1);
    return SEASON[date.getUTCMonth()] ?? 1;
  }

  const weekday = (index + (period === 'last_7_days' ? 1 : 0)) % 7;
  return weekday === 0 || weekday === 6 ? 0.72 : 1 + weekday * 0.04;
}

function niceTarget(previous: number): number {
  if (previous <= 0) {
    return 1;
  }

  const raised = previous * 1.12;
  const magnitude = 10 ** Math.floor(Math.log10(raised));
  return Math.ceil(raised / magnitude) * magnitude;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function hash(value: string): number {
  let next = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    next ^= value.charCodeAt(index);
    next = Math.imul(next, 16777619);
  }
  return next >>> 0;
}

function mulberry32(seed: number): () => number {
  let next = seed;
  return () => {
    next += 0x6d2b79f5;
    let value = Math.imul(next ^ (next >>> 15), 1 | next);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function queryFilters(query: WidgetQuery): DashboardFilters {
  return query.filters ?? emptyFilters();
}

function queryPeriod(query: WidgetQuery) {
  return effectivePeriod(query.config.period, queryFilters(query));
}

function filterFingerprint(filters: DashboardFilters): string {
  return `${filters.period}|${filters.region}|${filters.category}|${filters.product}|${filters.seller}`;
}

function matchingFilter(dimension: DimensionId, filters: DashboardFilters): string {
  if (dimension === 'region') {
    return filters.region;
  }

  if (dimension === 'category') {
    return filters.category;
  }

  if (dimension === 'product') {
    return filters.product;
  }

  if (dimension === 'seller') {
    return filters.seller;
  }

  return '';
}

function filterScale(query: WidgetQuery): number {
  const dimension = query.config.dimension;
  const filters = queryFilters(query);
  let scale = 1;

  if (filters.region && dimension !== 'region') {
    scale *= selectedShare(filters.region, REGIONS.length);
  }

  if (filters.category && dimension !== 'category') {
    scale *= selectedShare(filters.category, CATEGORIES.length);
  }

  if (filters.product && dimension !== 'product') {
    scale *= selectedShare(filters.product, PRODUCTS.length);
  }

  if (filters.seller && dimension !== 'seller') {
    scale *= selectedShare(filters.seller, SELLERS.length);
  }

  return scale;
}

function selectedShare(raw: string, size: number): number {
  const count = splitFilterValues(raw).length;
  if (count === 0 || size <= 0) {
    return 1;
  }
  return Math.max(0.18, count / size);
}

export const MOCK_ANALYTICS_AS_OF = '2026-08-24';
export const MOCK_DIMENSIONS = { REGIONS, CATEGORIES, PRODUCTS, SELLERS };
