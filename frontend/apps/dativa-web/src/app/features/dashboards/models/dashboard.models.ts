import { WidgetInstance } from '../widgets/widget.models';
import { DashboardFilters, emptyFilters, normalizeFilters } from '../filters/dashboard-filters';

export interface FilterPreset {
  id: string;
  name: string;
  filters: DashboardFilters;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: WidgetInstance[];
  filters: DashboardFilters;
  filterPresets: FilterPreset[];
  featured: boolean;
  isDefault: boolean;
  openCount: number;
  updatedAt: string;
}

export interface DashboardSummary {
  id: string;
  name: string;
  description: string;
  widgetCount: number;
  updatedAt: string;
  featured: boolean;
  isDefault: boolean;
  openCount: number;
}

export interface DashboardDraft {
  name: string;
  description: string;
}

export function toSummary(dashboard: Dashboard): DashboardSummary {
  return {
    id: dashboard.id,
    name: dashboard.name,
    description: dashboard.description,
    widgetCount: dashboard.widgets.length,
    updatedAt: dashboard.updatedAt,
    featured: dashboard.featured,
    isDefault: dashboard.isDefault,
    openCount: dashboard.openCount,
  };
}

export function cloneDashboard(dashboard: Dashboard): Dashboard {
  const copy = structuredClone(dashboard);
  copy.filters = normalizeFilters(copy.filters);
  copy.filterPresets = (copy.filterPresets ?? []).map((preset) => ({
    ...preset,
    filters: normalizeFilters(preset.filters),
  }));
  copy.featured = Boolean(copy.featured);
  copy.isDefault = Boolean(copy.isDefault);
  copy.openCount = copy.openCount ?? 0;
  return copy;
}

export function serializeDashboard(dashboard: Dashboard): string {
  return JSON.stringify({
    name: dashboard.name,
    description: dashboard.description,
    featured: dashboard.featured,
    isDefault: dashboard.isDefault,
    filters: normalizeFilters(dashboard.filters),
    filterPresets: dashboard.filterPresets ?? [],
    widgets: dashboard.widgets.map((widget) => ({
      id: widget.id,
      type: widget.type,
      title: widget.title,
      config: widget.config,
      layout: {
        x: widget.layout.x,
        y: widget.layout.y,
        cols: widget.layout.cols,
        rows: widget.layout.rows,
      },
    })),
  });
}

export function emptyDashboardFields(): Pick<
  Dashboard,
  'filterPresets' | 'featured' | 'isDefault' | 'openCount'
> {
  return {
    filterPresets: [],
    featured: false,
    isDefault: false,
    openCount: 0,
  };
}

export function withDashboardDefaults(dashboard: Dashboard): Dashboard {
  return cloneDashboard({
    ...emptyDashboardFields(),
    ...dashboard,
    filters: dashboard.filters ?? emptyFilters(),
    filterPresets: dashboard.filterPresets ?? [],
  });
}
