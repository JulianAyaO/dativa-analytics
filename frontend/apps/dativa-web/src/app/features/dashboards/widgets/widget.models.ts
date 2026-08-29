export type WidgetType =
  | 'kpi'
  | 'line'
  | 'bar'
  | 'area'
  | 'pie'
  | 'table'
  | 'ranking'
  | 'progress';

export type WidgetFamily =
  | 'kpi'
  | 'series'
  | 'composition'
  | 'table'
  | 'ranking'
  | 'progress';

export type DatasetId = 'sales' | 'orders';
export type MetricId = 'revenue' | 'units' | 'orders' | 'avg_ticket';
export type DimensionId = 'month' | 'region' | 'category' | 'product' | 'seller';

export interface WidgetLayout {
  x: number;
  y: number;
  cols: number;
  rows: number;
}

export interface WidgetConfig {
  dataset: DatasetId;
  metric: MetricId;
  dimension?: DimensionId;
  period?: 'last_7_days' | 'last_30_days' | 'last_12_months';
  topN?: number;
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  title: string;
  layout: WidgetLayout;
  config: WidgetConfig;
}

export interface WidgetDefinition {
  type: WidgetType;
  family: WidgetFamily;
  label: string;
  description: string;
}
