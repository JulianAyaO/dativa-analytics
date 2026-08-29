import { WidgetConfig, WidgetType } from './widget.models';

export const DATASET_OPTIONS = [
  { value: 'sales', label: 'Ventas' },
  { value: 'orders', label: 'Pedidos' },
] as const;

export const METRIC_OPTIONS = [
  { value: 'revenue', label: 'Ingresos' },
  { value: 'units', label: 'Unidades' },
  { value: 'orders', label: 'Pedidos' },
  { value: 'avg_ticket', label: 'Ticket promedio' },
] as const;

export const DIMENSION_OPTIONS = [
  { value: 'month', label: 'Mes' },
  { value: 'region', label: 'Región' },
  { value: 'category', label: 'Categoría' },
  { value: 'product', label: 'Producto' },
  { value: 'seller', label: 'Vendedor' },
] as const;

export const PERIOD_OPTIONS = [
  { value: 'last_7_days', label: 'Últimos 7 días' },
  { value: 'last_30_days', label: 'Últimos 30 días' },
  { value: 'last_12_months', label: 'Últimos 12 meses' },
] as const;

export const TOP_N_OPTIONS = [3, 5, 10] as const;

export function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string | undefined,
): string {
  return options.find((item) => item.value === value)?.label ?? value ?? '';
}

export function summarizeConfig(typeLabel: string, config: WidgetConfig): string {
  const metric = optionLabel(METRIC_OPTIONS, config.metric);
  const dataset = optionLabel(DATASET_OPTIONS, config.dataset);
  const dimension = config.dimension
    ? ` por ${optionLabel(DIMENSION_OPTIONS, config.dimension).toLowerCase()}`
    : '';
  const period = optionLabel(PERIOD_OPTIONS, config.period ?? 'last_12_months');
  return `${typeLabel}: ${metric} de ${dataset}${dimension} · ${period}`;
}

export function defaultTitle(type: WidgetType, config: WidgetConfig): string {
  const metric = optionLabel(METRIC_OPTIONS, config.metric);
  const dimension = config.dimension
    ? optionLabel(DIMENSION_OPTIONS, config.dimension)
    : optionLabel(DATASET_OPTIONS, config.dataset);
  return `${metric} · ${dimension}`;
}
