import { Injectable, computed, inject, signal } from '@angular/core';
import { DashboardApi } from '../data/dashboard.api';
import { Dashboard, cloneDashboard, serializeDashboard } from '../models/dashboard.models';
import { WidgetConfig, WidgetInstance } from '../widgets/widget.models';
import { cloneWidget } from '../widgets/widget.factory';
import { defaultTitle } from '../widgets/widget.schema';
import { DashboardFilters, normalizeFilters } from '../filters/dashboard-filters';

export type WorkspaceStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'saving' | 'error';

@Injectable()
export class DashboardWorkspaceStore {
  private readonly api = inject(DashboardApi);

  private readonly dashboard = signal<Dashboard | null>(null);
  private readonly snapshot = signal('');
  private readonly revision = signal(0);

  readonly status = signal<WorkspaceStatus>('idle');
  readonly selectedWidgetId = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);

  readonly current = computed(() => this.dashboard());
  readonly widgets = computed(() => this.current()?.widgets ?? []);
  readonly selectedWidget = computed(
    () => this.widgets().find((widget) => widget.id === this.selectedWidgetId()) ?? null,
  );
  readonly dirty = computed(() => {
    this.revision();
    const dashboard = this.dashboard();
    return dashboard !== null && serializeDashboard(dashboard) !== this.snapshot();
  });

  async load(id: string): Promise<void> {
    this.status.set('loading');
    this.selectedWidgetId.set(null);
    this.saveError.set(null);

    try {
      const dashboard = await this.api.getById(id);
      if (!dashboard) {
        this.dashboard.set(null);
        this.snapshot.set('');
        this.status.set('missing');
        return;
      }

      const copy = cloneDashboard(dashboard);
      this.dashboard.set(copy);
      this.snapshot.set(serializeDashboard(copy));
      this.revision.set(0);
      this.status.set('ready');
    } catch {
      this.dashboard.set(null);
      this.snapshot.set('');
      this.status.set('error');
    }
  }

  selectWidget(id: string | null): void {
    this.selectedWidgetId.set(id);
  }

  addWidget(widget: WidgetInstance): WidgetInstance {
    this.updateDashboard((dashboard) => ({
      ...dashboard,
      widgets: [...dashboard.widgets, widget],
    }));
    this.selectedWidgetId.set(widget.id);
    return widget;
  }

  duplicateWidget(id: string): void {
    const source = this.widgets().find((widget) => widget.id === id);
    if (!source) {
      return;
    }

    const copy = cloneWidget(source);
    copy.layout.x = Math.min(source.layout.x + 1, 10);
    copy.layout.y = source.layout.y + source.layout.rows;

    this.updateDashboard((dashboard) => ({
      ...dashboard,
      widgets: [...dashboard.widgets, copy],
    }));
    this.selectedWidgetId.set(copy.id);
  }

  removeWidget(id: string): void {
    this.updateDashboard((dashboard) => ({
      ...dashboard,
      widgets: dashboard.widgets.filter((widget) => widget.id !== id),
    }));

    if (this.selectedWidgetId() === id) {
      this.selectedWidgetId.set(null);
    }
  }

  updateWidgetTitle(id: string, title: string): void {
    this.patchWidget(id, (widget) => ({ ...widget, title }));
  }

  updateWidgetConfig(id: string, config: WidgetConfig): void {
    this.patchWidget(id, (widget) => ({
      ...widget,
      config,
      title: widget.title === defaultTitle(widget.type, widget.config)
        ? defaultTitle(widget.type, config)
        : widget.title,
    }));
  }

  updateName(name: string): void {
    this.updateDashboard((dashboard) => ({ ...dashboard, name }));
  }

  updateFilters(filters: DashboardFilters): void {
    this.updateDashboard((dashboard) => ({
      ...dashboard,
      filters: normalizeFilters(filters),
    }));
  }

  addFilterPreset(name: string, filters: DashboardFilters): void {
    const label = name.trim();
    if (!label) {
      return;
    }
    this.updateDashboard((dashboard) => {
      const presets = dashboard.filterPresets ?? [];
      if (presets.length >= 3) {
        return dashboard;
      }
      return {
        ...dashboard,
        filterPresets: [
          ...presets,
          { id: crypto.randomUUID(), name: label, filters: normalizeFilters(filters) },
        ],
      };
    });
  }

  removeFilterPreset(id: string): void {
    this.updateDashboard((dashboard) => ({
      ...dashboard,
      filterPresets: (dashboard.filterPresets ?? []).filter((preset) => preset.id !== id),
    }));
  }

  touchLayout(): void {
    this.revision.update((value) => value + 1);
  }

  discard(): void {
    const current = this.dashboard();
    if (!current) {
      return;
    }

    const restored = JSON.parse(this.snapshot()) as Pick<
      Dashboard,
      'name' | 'description' | 'widgets' | 'filters' | 'filterPresets'
    >;
    this.dashboard.set({
      ...current,
      name: restored.name,
      description: restored.description,
      widgets: restored.widgets,
      filters: normalizeFilters(restored.filters),
      filterPresets: restored.filterPresets ?? [],
    });
    this.selectedWidgetId.set(null);
    this.revision.update((value) => value + 1);
  }

  async save(): Promise<boolean> {
    const current = this.dashboard();
    if (!current) {
      return false;
    }

    this.status.set('saving');
    this.saveError.set(null);

    try {
      const saved = await this.api.save(current);
      const copy = cloneDashboard(saved);
      this.dashboard.set(copy);
      this.snapshot.set(serializeDashboard(copy));
      this.status.set('ready');
      this.revision.update((value) => value + 1);
      return true;
    } catch {
      this.saveError.set('No se pudo guardar el dashboard.');
      this.status.set('ready');
      return false;
    }
  }

  private patchWidget(
    id: string,
    mutate: (widget: WidgetInstance) => WidgetInstance,
  ): void {
    this.updateDashboard((dashboard) => ({
      ...dashboard,
      widgets: dashboard.widgets.map((widget) => (widget.id === id ? mutate(widget) : widget)),
    }));
  }

  private updateDashboard(mutate: (dashboard: Dashboard) => Dashboard): void {
    const current = this.dashboard();
    if (!current) {
      return;
    }

    this.dashboard.set(mutate(current));
    this.revision.update((value) => value + 1);
  }
}
