import { WidgetConfig, WidgetInstance, WidgetLayout, WidgetType } from './widget.models';
import { familyForWidget } from './widget.registry';
import { defaultTitle } from './widget.schema';

const DEFAULT_SIZE: Record<WidgetType, Pick<WidgetLayout, 'cols' | 'rows'>> = {
  kpi: { cols: 3, rows: 2 },
  line: { cols: 6, rows: 4 },
  bar: { cols: 6, rows: 4 },
  area: { cols: 6, rows: 4 },
  pie: { cols: 4, rows: 4 },
  table: { cols: 6, rows: 4 },
  ranking: { cols: 4, rows: 5 },
  progress: { cols: 3, rows: 2 },
};

export function defaultConfig(type: WidgetType): WidgetConfig {
  const family = familyForWidget(type);
  const base: WidgetConfig = {
    dataset: 'sales',
    metric: 'revenue',
    period: 'last_12_months',
  };

  if (family === 'kpi' || family === 'progress') {
    return base;
  }

  if (family === 'series') {
    return { ...base, dimension: 'month' };
  }

  if (family === 'ranking') {
    return { ...base, dimension: 'seller', topN: 5 };
  }

  return { ...base, dimension: 'category' };
}

export function createWidget(type: WidgetType, layout?: Partial<WidgetLayout>): WidgetInstance {
  const config = defaultConfig(type);
  const size = DEFAULT_SIZE[type];

  return {
    id: crypto.randomUUID(),
    type,
    title: defaultTitle(type, config),
    config,
    layout: {
      x: layout?.x ?? 0,
      y: layout?.y ?? 0,
      cols: layout?.cols ?? size.cols,
      rows: layout?.rows ?? size.rows,
    },
  };
}

export function cloneWidget(widget: WidgetInstance): WidgetInstance {
  return {
    ...widget,
    id: crypto.randomUUID(),
    title: `${widget.title} (copia)`,
    config: { ...widget.config },
    layout: { ...widget.layout, x: widget.layout.x, y: widget.layout.y },
  };
}

export function usesDimension(type: WidgetType): boolean {
  const family = familyForWidget(type);
  return family !== 'kpi' && family !== 'progress';
}

export function usesTopN(type: WidgetType): boolean {
  return familyForWidget(type) === 'ranking';
}
