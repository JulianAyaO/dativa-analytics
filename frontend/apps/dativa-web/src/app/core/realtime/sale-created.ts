import { DatasetId } from '../../features/dashboards/widgets/widget.models';
import {
  DashboardFilters,
  effectivePeriod,
  matchesDimensionFilter,
} from '../../features/dashboards/filters/dashboard-filters';
import { WidgetQuery } from '../../features/dashboards/widgets/query/widget-query.models';

export type RealtimeStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface SaleCreated {
  type: 'SaleCreated';
  id: string;
  dataset: DatasetId;
  occurredAt: string;
  region: string;
  category: string;
  product: string;
  seller: string;
  quantity: number;
  amount: number;
}

export interface RealtimeEvent {
  seq: number;
  sale: SaleCreated;
}

export const REALTIME_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000] as const;

export function realtimeBackoff(attempt: number): number {
  const index = Math.min(Math.max(attempt, 0), REALTIME_BACKOFF_MS.length - 1);
  return REALTIME_BACKOFF_MS[index] ?? 30_000;
}

export function parseSaleCreated(raw: unknown): SaleCreated | null {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const dataset = value['dataset'];
  const occurredAt = readString(value['occurredAt']);
  if (value['type'] !== 'SaleCreated' || (dataset !== 'sales' && dataset !== 'orders') || !occurredAt) {
    return null;
  }

  const id = readString(value['id']);
  const region = readString(value['region']);
  const category = readString(value['category']);
  const product = readString(value['product']);
  const seller = readString(value['seller']);
  if (!id || !region || !category || !product || !seller) {
    return null;
  }

  return {
    type: 'SaleCreated',
    id,
    dataset,
    occurredAt,
    region,
    category,
    product,
    seller,
    quantity: Number(value['quantity']) || 0,
    amount: Number(value['amount']) || 0,
  };
}

export function saleAffectsQuery(sale: SaleCreated, query: WidgetQuery, now = Date.now()): boolean {
  if (sale.dataset !== query.config.dataset) {
    return false;
  }

  return matchesFilters(sale, query.filters, effectivePeriod(query.config.period, query.filters), '', now);
}

export function saleAffectsExplorer(
  sale: SaleCreated,
  dataset: DatasetId,
  filters: DashboardFilters,
  search: string,
  now = Date.now(),
): boolean {
  if (isSyntheticLiveSale(sale) || sale.dataset !== dataset) {
    return false;
  }

  const period = effectivePeriod('last_12_months', filters);
  return matchesFilters(sale, filters, period, search, now);
}

export function isSyntheticLiveSale(sale: SaleCreated): boolean {
  return sale.id.startsWith('live-');
}

export function periodRangeUtc(
  period: 'last_7_days' | 'last_30_days' | 'last_12_months',
  nowMs: number,
): { from: number; to: number } {
  const today = new Date(nowMs);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  const startOfToday = Date.UTC(year, month, day);

  if (period === 'last_7_days') {
    return { from: startOfToday - 6 * 86_400_000, to: startOfToday + 86_400_000 };
  }

  if (period === 'last_30_days') {
    return { from: startOfToday - 29 * 86_400_000, to: startOfToday + 86_400_000 };
  }

  return {
    from: Date.UTC(year, month - 11, 1),
    to: Date.UTC(year, month + 1, 1),
  };
}

function matchesFilters(
  sale: SaleCreated,
  filters: DashboardFilters,
  period: 'last_7_days' | 'last_30_days' | 'last_12_months',
  search: string,
  now: number,
): boolean {
  const time = Date.parse(sale.occurredAt);
  if (!Number.isFinite(time)) {
    return false;
  }

  const range = periodRangeUtc(period, now);
  if (time < range.from || time >= range.to) {
    return false;
  }

  if (!matchesDimensionFilter(filters.region, sale.region)) {
    return false;
  }
  if (!matchesDimensionFilter(filters.category, sale.category)) {
    return false;
  }
  if (!matchesDimensionFilter(filters.product, sale.product)) {
    return false;
  }
  if (!matchesDimensionFilter(filters.seller, sale.seller)) {
    return false;
  }

  const needle = search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return [sale.region, sale.category, sale.product, sale.seller].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
