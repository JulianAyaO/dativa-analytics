import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActivityLog } from '../../../core/activity/activity.log';
import {
  Dashboard,
  DashboardDraft,
  cloneDashboard,
  emptyDashboardFields,
  toSummary,
  withDashboardDefaults,
} from '../models/dashboard.models';
import { emptyFilters } from '../filters/dashboard-filters';

const STORAGE_KEY = 'dativa.dashboards';

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly http = inject(HttpClient);
  private readonly activity = inject(ActivityLog);

  async list(): Promise<Dashboard[]> {
    if (environment.useMockAuth) {
      return this.readAll().map(cloneDashboard);
    }

    const dashboards = await firstValueFrom(
      this.http.get<Dashboard[]>(`${environment.apiUrl}/dashboards`),
    );
    return dashboards.map(withDashboardDefaults);
  }

  async getById(id: string): Promise<Dashboard | null> {
    if (environment.useMockAuth) {
      const found = this.readAll().find((item) => item.id === id);
      return found ? cloneDashboard(found) : null;
    }

    try {
      const dashboard = await firstValueFrom(
        this.http.get<Dashboard>(`${environment.apiUrl}/dashboards/${id}`),
      );
      return withDashboardDefaults(dashboard);
    } catch {
      return null;
    }
  }

  async create(draft: DashboardDraft): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      widgets: [],
      filters: emptyFilters(),
      updatedAt: new Date().toISOString(),
      ...emptyDashboardFields(),
    };

    if (environment.useMockAuth) {
      this.writeAll([...this.readAll(), dashboard]);
      this.prependOrder(dashboard.id);
      this.activity.record('dashboard.created', 'dashboard', `Se creó ${dashboard.name}.`);
      return cloneDashboard(dashboard);
    }

    return withDashboardDefaults(
      await firstValueFrom(this.http.post<Dashboard>(`${environment.apiUrl}/dashboards`, draft)),
    );
  }

  async save(dashboard: Dashboard): Promise<Dashboard> {
    const next = {
      ...cloneDashboard(dashboard),
      updatedAt: new Date().toISOString(),
    };

    if (environment.useMockAuth) {
      const all = this.readAll();
      const index = all.findIndex((item) => item.id === next.id);
      if (index === -1) {
        throw new Error('DASHBOARD_NOT_FOUND');
      }
      const previous = all[index];
      all[index] = next;
      this.writeAll(all);
      this.recordWidgetDiff(previous, next);
      this.activity.record('dashboard.updated', 'dashboard', `Se modificó ${next.name}.`);
      return cloneDashboard(next);
    }

    return withDashboardDefaults(
      await firstValueFrom(
        this.http.put<Dashboard>(`${environment.apiUrl}/dashboards/${next.id}`, next),
      ),
    );
  }

  async duplicate(id: string): Promise<Dashboard> {
    const source = await this.getById(id);
    if (!source) {
      throw new Error('DASHBOARD_NOT_FOUND');
    }

    const copy: Dashboard = {
      ...cloneDashboard(source),
      id: crypto.randomUUID(),
      name: `${source.name} (copia)`,
      featured: false,
      isDefault: false,
      openCount: 0,
      updatedAt: new Date().toISOString(),
      widgets: source.widgets.map((widget) => ({
        ...widget,
        id: crypto.randomUUID(),
      })),
    };

    if (environment.useMockAuth) {
      this.writeAll([...this.readAll(), copy]);
      this.prependOrder(copy.id);
      this.activity.record('dashboard.created', 'dashboard', `Se duplicó ${source.name}.`);
      return cloneDashboard(copy);
    }

    return withDashboardDefaults(
      await firstValueFrom(this.http.post<Dashboard>(`${environment.apiUrl}/dashboards/${id}/duplicate`, {})),
    );
  }

  async setFeatured(id: string, featured: boolean): Promise<void> {
    const dashboard = await this.require(id);
    dashboard.featured = featured;
    await this.save(dashboard);
  }

  async reorder(ids: readonly string[]): Promise<void> {
    writeCatalogOrder(ids);
  }

  async incrementOpen(id: string): Promise<void> {
    const dashboard = await this.getById(id);
    if (!dashboard) {
      return;
    }
    dashboard.openCount = (dashboard.openCount ?? 0) + 1;
    if (environment.useMockAuth) {
      const all = this.readAll();
      const index = all.findIndex((item) => item.id === id);
      if (index !== -1) {
        all[index] = { ...all[index], openCount: dashboard.openCount };
        this.writeAll(all);
      }
      return;
    }
    await firstValueFrom(this.http.post(`${environment.apiUrl}/dashboards/${id}/open`, {}));
  }

  async remove(id: string): Promise<void> {
    const current = await this.getById(id);
    if (environment.useMockAuth) {
      this.writeAll(this.readAll().filter((item) => item.id !== id));
      writeCatalogOrder(readCatalogOrder().filter((item) => item !== id));
      if (current) {
        this.activity.record('dashboard.deleted', 'dashboard', `Se eliminó ${current.name}.`);
      }
      return;
    }

    await firstValueFrom(this.http.delete<void>(`${environment.apiUrl}/dashboards/${id}`));
  }

  async summaries() {
    const dashboards = await this.list();
    return applyCatalogOrder(dashboards.map(toSummary));
  }

  catalogOrder(): string[] {
    return readCatalogOrder();
  }

  private prependOrder(id: string): void {
    writeCatalogOrder([id, ...readCatalogOrder().filter((item) => item !== id)]);
  }

  private async require(id: string): Promise<Dashboard> {
    const dashboard = await this.getById(id);
    if (!dashboard) {
      throw new Error('DASHBOARD_NOT_FOUND');
    }
    return dashboard;
  }

  private recordWidgetDiff(previous: Dashboard, next: Dashboard): void {
    const before = new Set(previous.widgets.map((widget) => widget.id));
    const after = new Set(next.widgets.map((widget) => widget.id));
    for (const widget of next.widgets) {
      if (!before.has(widget.id)) {
        this.activity.record('widget.created', 'widget', `Se añadió ${widget.title} en ${next.name}.`);
      } else {
        const original = previous.widgets.find((item) => item.id === widget.id);
        if (original && JSON.stringify(original) !== JSON.stringify(widget)) {
          this.activity.record('widget.updated', 'widget', `Se modificó ${widget.title} en ${next.name}.`);
        }
      }
    }
    for (const widget of previous.widgets) {
      if (!after.has(widget.id)) {
        this.activity.record('widget.deleted', 'widget', `Se eliminó ${widget.title} de ${next.name}.`);
      }
    }
  }

  private readAll(): Dashboard[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Dashboard[];
      return Array.isArray(parsed) ? parsed.map((item) => withDashboardDefaults(item)) : [];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  private writeAll(dashboards: Dashboard[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
  }
}

const ORDER_KEY = 'dativa.dashboards.order';

export type CatalogSort = 'manual' | 'featured' | 'updated' | 'name' | 'opens';

export function readCatalogOrder(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function writeCatalogOrder(ids: readonly string[]): void {
  localStorage.setItem(ORDER_KEY, JSON.stringify([...new Set(ids)]));
}

export function applyCatalogOrder<T extends { id: string }>(items: readonly T[]): T[] {
  const rank = new Map(readCatalogOrder().map((id, index) => [id, index]));
  return [...items].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank == null && rightRank == null) {
      return 0;
    }
    if (leftRank == null) {
      return 1;
    }
    if (rightRank == null) {
      return -1;
    }
    return leftRank - rightRank;
  });
}
