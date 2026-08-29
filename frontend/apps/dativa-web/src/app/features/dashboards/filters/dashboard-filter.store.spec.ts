import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardFilterStore } from './dashboard-filter.store';
import { DashboardWorkspaceStore } from '../state/dashboard-workspace.store';
import { DashboardApi } from '../data/dashboard.api';
import { Dashboard } from '../models/dashboard.models';
import { emptyDashboardFields } from '../models/dashboard.models';
import { emptyFilters } from './dashboard-filters';

function sampleDashboard(): Dashboard {
  return {
    id: 'dash-1',
    name: 'Ventas',
    description: 'Tablero comercial',
    updatedAt: '2026-01-01T00:00:00.000Z',
    filters: emptyFilters(),
    widgets: [],
    ...emptyDashboardFields(),
  };
}

describe('DashboardFilterStore', () => {
  it('updates widgets-facing state and marks the workspace dirty', async () => {
    const api = {
      getById: vi.fn().mockResolvedValue(sampleDashboard()),
      save: vi.fn(async (next: Dashboard) => ({
        ...next,
        updatedAt: '2026-08-24T12:00:00.000Z',
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DashboardWorkspaceStore,
        DashboardFilterStore,
        { provide: DashboardApi, useValue: api },
      ],
    });

    const workspace = TestBed.inject(DashboardWorkspaceStore);
    const filters = TestBed.inject(DashboardFilterStore);

    await workspace.load('dash-1');
    filters.hydrate(workspace.current()?.filters);

    expect(workspace.dirty()).toBe(false);
    expect(filters.active()).toBe(false);

    filters.set('region', 'Caribe');

    expect(filters.value().region).toBe('Caribe');
    expect(filters.activeCount()).toBe(1);
    expect(workspace.dirty()).toBe(true);
    expect(workspace.current()?.filters.region).toBe('Caribe');

    const saved = await workspace.save();
    expect(saved).toBe(true);
    expect((api.save.mock.calls[0][0] as Dashboard).filters.region).toBe('Caribe');
  });

  it('does not persist hydration and restores filters after discard', async () => {
    const api = {
      getById: vi.fn().mockResolvedValue({
        ...sampleDashboard(),
        filters: { ...emptyFilters(), category: 'Hogar' },
      }),
      save: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DashboardWorkspaceStore,
        DashboardFilterStore,
        { provide: DashboardApi, useValue: api },
      ],
    });

    const workspace = TestBed.inject(DashboardWorkspaceStore);
    const filters = TestBed.inject(DashboardFilterStore);

    await workspace.load('dash-1');
    filters.hydrate(workspace.current()?.filters);

    expect(workspace.dirty()).toBe(false);
    expect(filters.value().category).toBe('Hogar');

    filters.set('seller', 'Ana Pérez');
    expect(workspace.dirty()).toBe(true);

    workspace.discard();
    filters.hydrate(workspace.current()?.filters);

    expect(workspace.dirty()).toBe(false);
    expect(filters.value().category).toBe('Hogar');
    expect(filters.value().seller).toBe('');
  });

  it('works without a workspace in view mode', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), DashboardFilterStore],
    });

    const filters = TestBed.inject(DashboardFilterStore);
    filters.set('product', 'Auriculares');

    expect(filters.activeCount()).toBe(1);
    expect(filters.chips()[0]?.key).toBe('product');

    filters.reset();
    expect(filters.active()).toBe(false);
  });
});
