import { PERIOD_OPTIONS, optionLabel } from '../widgets/widget.schema';

export const FILTER_PERIOD_OPTIONS = PERIOD_OPTIONS;

export type FilterPeriod = (typeof FILTER_PERIOD_OPTIONS)[number]['value'] | '';

export interface DashboardFilters {
  period: FilterPeriod;
  region: string;
  category: string;
  product: string;
  seller: string;
}

export interface FilterChip {
  key: keyof DashboardFilters;
  value?: string;
  label: string;
}

export const EMPTY_FILTERS: DashboardFilters = {
  period: '',
  region: '',
  category: '',
  product: '',
  seller: '',
};

export function emptyFilters(): DashboardFilters {
  return { ...EMPTY_FILTERS };
}

export function normalizeFilters(
  input?: Partial<DashboardFilters> | null,
): DashboardFilters {
  return {
    period: input?.period === 'last_7_days' || input?.period === 'last_30_days' || input?.period === 'last_12_months'
      ? input.period
      : '',
    region: joinFilterValues(splitFilterValues(input?.region ?? '')),
    category: joinFilterValues(splitFilterValues(input?.category ?? '')),
    product: joinFilterValues(splitFilterValues(input?.product ?? '')),
    seller: joinFilterValues(splitFilterValues(input?.seller ?? '')),
  };
}

export function countActiveFilters(filters: DashboardFilters): number {
  return filterChips(filters).length;
}

export function filterChips(filters: DashboardFilters): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.period) {
    chips.push({
      key: 'period',
      label: `Fecha: ${optionLabel(FILTER_PERIOD_OPTIONS, filters.period)}`,
    });
  }

  if (filters.region) {
    for (const value of splitFilterValues(filters.region)) {
      chips.push({ key: 'region', value, label: `Región: ${value}` });
    }
  }

  if (filters.category) {
    for (const value of splitFilterValues(filters.category)) {
      chips.push({ key: 'category', value, label: `Categoría: ${value}` });
    }
  }

  if (filters.product) {
    for (const value of splitFilterValues(filters.product)) {
      chips.push({ key: 'product', value, label: `Producto: ${value}` });
    }
  }

  if (filters.seller) {
    for (const value of splitFilterValues(filters.seller)) {
      chips.push({ key: 'seller', value, label: `Vendedor: ${value}` });
    }
  }

  return chips;
}

export function effectivePeriod(
  widgetPeriod: DashboardFilters['period'] | undefined,
  filters: DashboardFilters,
): NonNullable<Exclude<DashboardFilters['period'], ''>> {
  if (filters.period) {
    return filters.period;
  }

  return widgetPeriod || 'last_12_months';
}

export function splitFilterValues(raw: string): string[] {
  return [...new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function joinFilterValues(values: readonly string[]): string {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))].join(',');
}

export function matchesDimensionFilter(raw: string, value: string): boolean {
  const selected = splitFilterValues(raw);
  return selected.length === 0 || selected.includes(value);
}

export function toggleFilterValue(raw: string, value: string): string {
  const selected = splitFilterValues(raw);
  return joinFilterValues(
    selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
  );
}
