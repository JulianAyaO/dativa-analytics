import {
  DashboardFilters,
  effectivePeriod,
  emptyFilters,
  normalizeFilters,
} from '../dashboards/filters/dashboard-filters';
import { DatasetId, DimensionId, WidgetInstance } from '../dashboards/widgets/widget.models';

export interface ExplorerQuery {
  dataset: DatasetId;
  period: string;
  region: string;
  category: string;
  product: string;
  seller: string;
}

export function toExplorerQuery(
  widget: WidgetInstance,
  filters: DashboardFilters,
  extra?: Partial<DashboardFilters>,
): ExplorerQuery {
  const merged = normalizeFilters({ ...filters, ...extra });
  return {
    dataset: widget.config.dataset,
    period: effectivePeriod(widget.config.period, merged),
    region: merged.region,
    category: merged.category,
    product: merged.product,
    seller: merged.seller,
  };
}

export function explorerQueryParams(query: ExplorerQuery): Record<string, string> {
  const params: Record<string, string> = { dataset: query.dataset };
  const filters: DashboardFilters = {
    period: query.period === 'last_7_days' || query.period === 'last_30_days' || query.period === 'last_12_months'
      ? query.period
      : '',
    region: query.region,
    category: query.category,
    product: query.product,
    seller: query.seller,
  };

  (Object.keys(emptyFilters()) as (keyof DashboardFilters)[]).forEach((key) => {
    const value = filters[key];
    if (value) {
      params[key] = value;
    }
  });
  return params;
}

export function rankingExplorerExtra(
  dimension: DimensionId | undefined,
  label: string,
): Partial<DashboardFilters> {
  if (
    dimension === 'region' ||
    dimension === 'category' ||
    dimension === 'product' ||
    dimension === 'seller'
  ) {
    return { [dimension]: label };
  }

  return {};
}
