import { WidgetDefinition, WidgetFamily, WidgetType } from './widget.models';

const FAMILY_BY_TYPE: Record<WidgetType, WidgetFamily> = {
  kpi: 'kpi',
  line: 'series',
  bar: 'series',
  area: 'series',
  pie: 'composition',
  table: 'table',
  ranking: 'ranking',
  progress: 'progress',
};

export const WIDGET_CATALOG: readonly WidgetDefinition[] = [
  {
    type: 'kpi',
    family: 'kpi',
    label: 'KPI',
    description: 'Indicador clave con valor y variación.',
  },
  {
    type: 'line',
    family: 'series',
    label: 'Línea',
    description: 'Evolución temporal de una métrica.',
  },
  {
    type: 'bar',
    family: 'series',
    label: 'Barras',
    description: 'Comparación por dimensión.',
  },
  {
    type: 'area',
    family: 'series',
    label: 'Área',
    description: 'Tendencia acumulada o evolución continua.',
  },
  {
    type: 'pie',
    family: 'composition',
    label: 'Circular',
    description: 'Composición de una métrica.',
  },
  {
    type: 'table',
    family: 'table',
    label: 'Tabla',
    description: 'Desglose compacto dentro del widget.',
  },
  {
    type: 'ranking',
    family: 'ranking',
    label: 'Ranking',
    description: 'Top N de vendedores, productos o regiones.',
  },
  {
    type: 'progress',
    family: 'progress',
    label: 'Progreso',
    description: 'Porcentaje respecto a una meta o al total.',
  },
];

export function familyForWidget(type: WidgetType): WidgetFamily {
  return FAMILY_BY_TYPE[type];
}
