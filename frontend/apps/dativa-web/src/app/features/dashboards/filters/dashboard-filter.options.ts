import { MOCK_DIMENSIONS } from '../widgets/query/mock-analytics';
import { importedDimensionOptions } from '../../import/data/imported-store';

function options(seed: readonly string[], extra: string[]): Array<{ value: string; label: string }> {
  const values = [...new Set([...seed, ...extra])].sort((a, b) => a.localeCompare(b, 'es'));
  return values.map((label) => ({ value: label, label }));
}

export function filterFieldOptions() {
  const extra = importedDimensionOptions();
  return {
    region: options(MOCK_DIMENSIONS.REGIONS, extra.region),
    category: options(MOCK_DIMENSIONS.CATEGORIES, extra.category),
    product: options(MOCK_DIMENSIONS.PRODUCTS, extra.product),
    seller: options(MOCK_DIMENSIONS.SELLERS, extra.seller),
  };
}

export const FILTER_FIELD_OPTIONS = filterFieldOptions();
