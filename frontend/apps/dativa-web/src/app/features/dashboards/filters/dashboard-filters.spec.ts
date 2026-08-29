import {
  countActiveFilters,
  effectivePeriod,
  emptyFilters,
  filterChips,
  matchesDimensionFilter,
  normalizeFilters,
  toggleFilterValue,
} from './dashboard-filters';

describe('dashboard filters', () => {
  it('normalizes missing and invalid values', () => {
    expect(normalizeFilters(null)).toEqual(emptyFilters());
    expect(normalizeFilters({ period: 'last_7_days', region: '  Caribe  ' }).region).toBe('Caribe');
    expect(normalizeFilters({ period: 'custom' as 'last_7_days' }).period).toBe('');
  });

  it('counts active filters and builds chips', () => {
    const filters = normalizeFilters({
      period: 'last_30_days',
      region: 'Caribe',
      category: '',
      product: 'Auriculares',
      seller: '',
    });

    expect(countActiveFilters(filters)).toBe(3);
    expect(filterChips(filters).map((chip) => chip.key)).toEqual([
      'period',
      'region',
      'product',
    ]);
  });

  it('lets the global period override the widget period', () => {
    expect(effectivePeriod('last_12_months', emptyFilters())).toBe('last_12_months');
    expect(effectivePeriod(undefined, emptyFilters())).toBe('last_12_months');
    expect(
      effectivePeriod('last_12_months', normalizeFilters({ period: 'last_7_days' })),
    ).toBe('last_7_days');
  });

  it('permite varias opciones en la misma dimensión', () => {
    const filters = normalizeFilters({ region: 'Caribe, Andina, Caribe' });
    expect(filters.region).toBe('Caribe,Andina');
    expect(filterChips(filters).map((chip) => chip.label)).toEqual([
      'Región: Caribe',
      'Región: Andina',
    ]);
    expect(matchesDimensionFilter(filters.region, 'Caribe')).toBe(true);
    expect(matchesDimensionFilter(filters.region, 'Pacífica')).toBe(false);
    expect(toggleFilterValue(filters.region, 'Pacífica')).toBe('Caribe,Andina,Pacífica');
    expect(toggleFilterValue(filters.region, 'Caribe')).toBe('Andina');
    expect(countActiveFilters(filters)).toBe(2);
  });
});
