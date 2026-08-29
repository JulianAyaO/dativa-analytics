import { DashboardFilters, emptyFilters, normalizeFilters } from '../../filters/dashboard-filters';
import { WidgetInstance } from '../widget.models';
import { WidgetQuery } from './widget-query.models';

export function toWidgetQuery(
  widget: WidgetInstance,
  filters?: DashboardFilters | Partial<DashboardFilters> | null,
): WidgetQuery {
  return {
    type: widget.type,
    config: {
      dataset: widget.config.dataset,
      metric: widget.config.metric,
      dimension: widget.config.dimension,
      period: widget.config.period ?? 'last_12_months',
      topN: widget.config.topN,
    },
    filters: normalizeFilters(filters),
  };
}

export function serializeWidgetQuery(
  widget: WidgetInstance,
  filters?: DashboardFilters | Partial<DashboardFilters> | null,
): string {
  const query = toWidgetQuery(widget, filters);
  return JSON.stringify({
    type: query.type,
    dataset: query.config.dataset,
    metric: query.config.metric,
    dimension: query.config.dimension ?? null,
    period: query.config.period ?? 'last_12_months',
    topN: query.config.topN ?? null,
    filters: query.filters,
  });
}

export function parseWidgetQuery(raw: string): WidgetQuery {
  const parsed = JSON.parse(raw) as {
    type: WidgetQuery['type'];
    dataset: WidgetQuery['config']['dataset'];
    metric: WidgetQuery['config']['metric'];
    dimension: WidgetQuery['config']['dimension'] | null;
    period: NonNullable<WidgetQuery['config']['period']>;
    topN: number | null;
    filters?: DashboardFilters | null;
  };

  return {
    type: parsed.type,
    config: {
      dataset: parsed.dataset,
      metric: parsed.metric,
      dimension: parsed.dimension ?? undefined,
      period: parsed.period,
      topN: parsed.topN ?? undefined,
    },
    filters: parsed.filters ? normalizeFilters(parsed.filters) : emptyFilters(),
  };
}
