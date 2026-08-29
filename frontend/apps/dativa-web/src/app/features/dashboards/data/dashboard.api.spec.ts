import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardApi } from './dashboard.api';

describe('DashboardApi', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    });
  });

  it('creates, updates layout and reads the same dashboard back', async () => {
    const api = TestBed.inject(DashboardApi);
    const created = await api.create({ name: 'Operación', description: '' });

    created.widgets.push({
      id: 'w1',
      type: 'line',
      title: 'Ingresos · Mes',
      layout: { x: 2, y: 1, cols: 6, rows: 4 },
      config: {
        dataset: 'sales',
        metric: 'revenue',
        dimension: 'month',
        period: 'last_12_months',
      },
    });

    const saved = await api.save(created);
    const loaded = await api.getById(saved.id);

    expect(loaded?.name).toBe('Operación');
    expect(loaded?.widgets[0]?.layout).toEqual({ x: 2, y: 1, cols: 6, rows: 4 });
    expect(loaded?.widgets[0]?.config.dimension).toBe('month');
    expect(loaded?.filters.region).toBe('');
  });

  it('normalizes dashboards saved without filters', async () => {
    localStorage.setItem(
      'dativa.dashboards',
      JSON.stringify([
        {
          id: 'legacy',
          name: 'Legacy',
          description: '',
          widgets: [],
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );

    const api = TestBed.inject(DashboardApi);
    const loaded = await api.getById('legacy');

    expect(loaded?.filters).toEqual({
      period: '',
      region: '',
      category: '',
      product: '',
      seller: '',
    });
  });

  it('persists dashboard filters', async () => {
    const api = TestBed.inject(DashboardApi);
    const created = await api.create({ name: 'Filtros', description: '' });

    created.filters = {
      ...created.filters,
      region: 'Caribe',
      category: 'Moda',
    };

    await api.save(created);
    const loaded = await api.getById(created.id);

    expect(loaded?.filters.region).toBe('Caribe');
    expect(loaded?.filters.category).toBe('Moda');
  });
});
