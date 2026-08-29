import { DashboardFilters } from '../../filters/dashboard-filters';
import { WidgetConfig, WidgetFamily, WidgetType } from '../widget.models';

export interface WidgetQuery {
  type: WidgetType;
  config: Required<Pick<WidgetConfig, 'dataset' | 'metric'>> &
    Pick<WidgetConfig, 'dimension' | 'period' | 'topN'>;
  filters: DashboardFilters;
}

export interface WidgetCategory {
  key: string;
  label: string;
}

export interface WidgetSeriesSet {
  id: string;
  label: string;
  values: number[];
}

export interface KpiWidgetData {
  family: 'kpi';
  value: number;
  previous: number;
  changePct: number | null;
  sparkline: {
    categories: WidgetCategory[];
    values: number[];
  };
}

export interface SeriesWidgetData {
  family: 'series';
  variant: 'line' | 'bar' | 'area';
  categories: WidgetCategory[];
  series: WidgetSeriesSet[];
}

export interface CompositionWidgetData {
  family: 'composition';
  slices: Array<WidgetCategory & { value: number }>;
  total: number;
}

export interface TableWidgetData {
  family: 'table';
  dimensionLabel: string;
  metricLabel: string;
  rows: Array<WidgetCategory & { value: number; share: number }>;
}

export interface RankingWidgetData {
  family: 'ranking';
  items: Array<{ rank: number; key: string; label: string; value: number; share: number }>;
}

export interface ProgressWidgetData {
  family: 'progress';
  value: number;
  target: number;
  ratio: number;
}

export type WidgetData =
  | KpiWidgetData
  | SeriesWidgetData
  | CompositionWidgetData
  | TableWidgetData
  | RankingWidgetData
  | ProgressWidgetData;

export type WidgetResult =
  | { status: 'ready'; query: WidgetQuery; family: WidgetFamily; data: WidgetData }
  | { status: 'empty'; query: WidgetQuery; family: WidgetFamily }
  | { status: 'error'; query: WidgetQuery; family: WidgetFamily; message: string };
