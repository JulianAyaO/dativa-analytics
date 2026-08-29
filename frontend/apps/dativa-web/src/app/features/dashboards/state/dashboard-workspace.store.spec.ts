import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardWorkspaceStore } from './dashboard-workspace.store';
import { DashboardApi } from '../data/dashboard.api';
import { Dashboard } from '../models/dashboard.models';
import { createWidget } from '../widgets/widget.factory';
import { emptyFilters } from '../filters/dashboard-filters';
import { emptyDashboardFields } from '../models/dashboard.models';

function sampleDashboard(): Dashboard {
  return {
    id: 'dash-1',
    name: 'Ventas',
    description: 'Tablero comercial',
    updatedAt: '2026-01-01T00:00:00.000Z',
    filters: emptyFilters(),
    widgets: [
      {
        id: 'w1',
        type: 'kpi',
        title: 'Ingresos Â· Ventas',
        layout: { x: 0, y: 0, cols: 3, rows: 2 },
        config: { dataset: 'sales', metric: 'revenue', period: 'last_12_months' },
      },
    ],
    ...emptyDashboardFields(),
  };
}

describe('DashboardWorkspaceStore', () => {
  let api: {
    getById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getById: vi.fn(),
      save: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DashboardWorkspaceStore,
        { provide: DashboardApi, useValue: api },
      ],
    });
  });

  it('loads a dashboard without marking it dirty', async () => {
    api.getById.mockResolvedValue(sampleDashboard());
    const store = TestBed.inject(DashboardWorkspaceStore);

    await store.load('dash-1');

    expect(store.status()).toBe('ready');
    expect(store.current()?.name).toBe('Ventas');
    expect(store.dirty()).toBe(false);
  });

  it('marks the workspace dirty after a config change and restores it on discard', async () => {
    api.getById.mockResolvedValue(sampleDashboard());
    const store = TestBed.inject(DashboardWorkspaceStore);

    await store.load('dash-1');
    store.updateName('Ventas Q1');
    store.updateWidgetConfig('w1', {
      dataset: 'orders',
      metric: 'orders',
      period: 'last_30_days',
    });

    expect(store.dirty()).toBe(true);
    expect(store.current()?.name).toBe('Ventas Q1');

    store.discard();

    expect(store.dirty()).toBe(false);
    expect(store.current()?.name).toBe('Ventas');
    expect(store.widgets()[0]?.config.dataset).toBe('sales');
  });

  it('persists in-place layout mutations when the grid reports a change', async () => {
    api.getById.mockResolvedValue(sampleDashboard());
    const store = TestBed.inject(DashboardWorkspaceStore);

    await store.load('dash-1');
    expect(store.dirty()).toBe(false);

    const widget = store.widgets()[0];
    widget.layout.x = 4;
    widget.layout.cols = 6;

    expect(store.dirty()).toBe(false);

    store.touchLayout();

    expect(store.dirty()).toBe(true);
    expect(store.widgets()[0]?.layout).toEqual({ x: 4, y: 0, cols: 6, rows: 2 });
  });

  it('adds a widget and saves layout plus configuration', async () => {
    const dashboard = sampleDashboard();
    api.getById.mockResolvedValue(dashboard);
    api.save.mockImplementation(async (next: Dashboard) => ({
      ...next,
      updatedAt: '2026-08-24T12:00:00.000Z',
    }));

    const store = TestBed.inject(DashboardWorkspaceStore);
    await store.load('dash-1');

    const extra = createWidget('bar', { x: 3, y: 0, cols: 6, rows: 4 });
    store.addWidget(extra);

    expect(store.selectedWidgetId()).toBe(extra.id);
    expect(store.dirty()).toBe(true);

    const saved = await store.save();

    expect(saved).toBe(true);
    expect(store.dirty()).toBe(false);
    expect(api.save).toHaveBeenCalledTimes(1);

    const persisted = api.save.mock.calls[0][0] as Dashboard;
    expect(persisted.widgets).toHaveLength(2);
    expect(persisted.widgets[1]?.layout).toEqual(extra.layout);
    expect(persisted.widgets[1]?.config.metric).toBe('revenue');
  });

  it('marks the workspace dirty when filters change and restores them on discard', async () => {
    api.getById.mockResolvedValue(sampleDashboard());
    const store = TestBed.inject(DashboardWorkspaceStore);

    await store.load('dash-1');
    store.updateFilters({ ...emptyFilters(), region: 'Pacífica', seller: 'Ana Pérez' });

    expect(store.dirty()).toBe(true);
    expect(store.current()?.filters.region).toBe('Pacífica');

    store.discard();

    expect(store.dirty()).toBe(false);
    expect(store.current()?.filters).toEqual(emptyFilters());
  });

  it('sets missing when the dashboard does not exist', async () => {
    api.getById.mockResolvedValue(null);
    const store = TestBed.inject(DashboardWorkspaceStore);

    await store.load('missing');

    expect(store.status()).toBe('missing');
    expect(store.current()).toBeNull();
  });
});
