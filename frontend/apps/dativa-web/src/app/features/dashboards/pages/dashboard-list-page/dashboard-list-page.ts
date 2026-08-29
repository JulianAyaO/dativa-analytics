import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Badge, Button, Card, EmptyState, Input, Loading, Select } from '@dativa/ui';
import { AuthStore } from '../../../../core/auth/auth.store';
import { PageHeader } from '../../../../layout/page-header/page-header';
import { CatalogSort, DashboardApi } from '../../data/dashboard.api';
import { DashboardSummary } from '../../models/dashboard.models';

const SORT_KEY = 'dativa.catalog.sort';

@Component({
  selector: 'dtv-dashboard-list-page',
  imports: [PageHeader, Button, Card, EmptyState, Input, Loading, FormField, Badge, NgTemplateOutlet, Select],
  templateUrl: './dashboard-list-page.html',
  styleUrl: './dashboard-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardListPage {
  private readonly api = inject(DashboardApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthStore);

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly summaries = signal<DashboardSummary[]>([]);
  protected readonly sort = signal<CatalogSort>(readCatalogSort());
  protected readonly draggingId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly sorts: Array<{ value: CatalogSort; label: string }> = [
    { value: 'manual', label: 'Mi orden' },
    { value: 'featured', label: 'En portada primero' },
    { value: 'updated', label: 'Más recientes' },
    { value: 'name', label: 'Nombre A-Z' },
    { value: 'opens', label: 'Más abiertos' },
  ];

  protected readonly visible = computed(() => sortSummaries(this.summaries(), this.sort()));
  protected readonly canReorder = computed(() => this.auth.canEdit() && this.sort() === 'manual');

  protected readonly draft = signal({
    name: '',
    description: '',
  });

  protected readonly createForm = form(this.draft, (fields) => {
    required(fields.name, { message: 'El nombre es obligatorio' });
  });

  constructor() {
    void this.refresh();
  }

  protected onSort(value: string): void {
    const next = this.sorts.some((item) => item.value === value) ? (value as CatalogSort) : 'manual';
    this.sort.set(next);
    writeCatalogSort(next);
  }

  protected openCreate(): void {
    this.creating.set(true);
    this.createError.set(null);
    this.draft.set({ name: '', description: '' });
  }

  protected cancelCreate(): void {
    this.creating.set(false);
    this.createError.set(null);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.creating()) {
      this.cancelCreate();
    }
  }

  protected async onCreate(event: Event): Promise<void> {
    event.preventDefault();
    this.createError.set(null);

    await submit(this.createForm, async () => {
      try {
        const dashboard = await this.api.create(this.draft());
        this.creating.set(false);
        await this.router.navigate(['/dashboards', dashboard.id, 'edit']);
      } catch {
        this.createError.set('No se pudo crear el dashboard.');
      }
    });
  }

  protected openView(id: string): void {
    void this.router.navigate(['/dashboards', id]);
  }

  protected openEditor(id: string): void {
    if (this.auth.canEdit()) {
      void this.router.navigate(['/dashboards', id, 'edit']);
    }
  }

  protected async remove(summary: DashboardSummary): Promise<void> {
    if (!this.auth.canEdit()) {
      return;
    }

    if (!globalThis.confirm(`¿Eliminar “${summary.name}”? Esta acción no se puede deshacer.`)) {
      return;
    }

    await this.api.remove(summary.id);
    await this.refresh();
  }

  protected async duplicate(summary: DashboardSummary): Promise<void> {
    if (!this.auth.canEdit()) {
      return;
    }
    const copy = await this.api.duplicate(summary.id);
    await this.refresh();
    await this.router.navigate(['/dashboards', copy.id, 'edit']);
  }

  protected async toggleFeatured(summary: DashboardSummary): Promise<void> {
    if (!this.auth.canEdit()) {
      return;
    }
    await this.api.setFeatured(summary.id, !summary.featured);
    await this.refresh();
  }

  protected onDragStart(id: string, event: DragEvent): void {
    if (!this.canReorder() || (event.target as HTMLElement | null)?.closest('button')) {
      event.preventDefault();
      return;
    }
    this.draggingId.set(id);
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.canReorder() || !this.draggingId()) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected async onDrop(targetId: string, event: DragEvent): Promise<void> {
    event.preventDefault();
    const sourceId = this.draggingId() ?? event.dataTransfer?.getData('text/plain');
    this.draggingId.set(null);
    if (!this.canReorder() || !sourceId || sourceId === targetId) {
      return;
    }

    const ids = this.visible().map((item) => item.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      return;
    }
    ids.splice(from, 1);
    ids.splice(to, 0, sourceId);
    await this.api.reorder(ids);
    this.summaries.set(ids.map((id) => this.summaries().find((item) => item.id === id)).filter(Boolean) as DashboardSummary[]);
  }

  protected onDragEnd(): void {
    this.draggingId.set(null);
  }

  protected formatUpdatedAt(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }

  protected async refresh(): Promise<void> {
    this.status.set('loading');

    try {
      this.summaries.set(await this.api.summaries());
      this.status.set('ready');
    } catch {
      this.summaries.set([]);
      this.status.set('error');
    }
  }
}

function readCatalogSort(): CatalogSort {
  try {
    const value = localStorage.getItem(SORT_KEY);
    if (value === 'featured' || value === 'updated' || value === 'name' || value === 'opens' || value === 'manual') {
      return value;
    }
  } catch {
    /* ignore */
  }
  return 'manual';
}

function writeCatalogSort(sort: CatalogSort): void {
  try {
    localStorage.setItem(SORT_KEY, sort);
  } catch {
    /* ignore */
  }
}

function sortSummaries(items: readonly DashboardSummary[], sort: CatalogSort): DashboardSummary[] {
  const copy = [...items];
  if (sort === 'manual') {
    return copy;
  }
  if (sort === 'featured') {
    return copy.sort((left, right) => Number(right.featured) - Number(left.featured) || right.updatedAt.localeCompare(left.updatedAt));
  }
  if (sort === 'name') {
    return copy.sort((left, right) => left.name.localeCompare(right.name, 'es'));
  }
  if (sort === 'opens') {
    return copy.sort((left, right) => right.openCount - left.openCount);
  }
  return copy.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
