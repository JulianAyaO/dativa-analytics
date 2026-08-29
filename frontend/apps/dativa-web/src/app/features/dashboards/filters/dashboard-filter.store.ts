import { Injectable, computed, inject, signal } from '@angular/core';
import { DashboardWorkspaceStore } from '../state/dashboard-workspace.store';
import {
  DashboardFilters,
  countActiveFilters,
  emptyFilters,
  filterChips,
  joinFilterValues,
  normalizeFilters,
  splitFilterValues,
  toggleFilterValue,
} from './dashboard-filters';

@Injectable()
export class DashboardFilterStore {
  private readonly workspace = inject(DashboardWorkspaceStore, { optional: true });
  private readonly filters = signal(emptyFilters());

  readonly value = this.filters.asReadonly();
  readonly activeCount = computed(() => countActiveFilters(this.filters()));
  readonly active = computed(() => this.activeCount() > 0);
  readonly chips = computed(() => filterChips(this.filters()));

  hydrate(filters?: Partial<DashboardFilters> | null): void {
    this.filters.set(normalizeFilters(filters));
    this.persist();
  }

  set(key: keyof DashboardFilters, value: string): void {
    const next = normalizeFilters({ ...this.filters(), [key]: value });
    const current = this.filters();
    if (
      next.period === current.period &&
      next.region === current.region &&
      next.category === current.category &&
      next.product === current.product &&
      next.seller === current.seller
    ) {
      return;
    }

    this.filters.set(next);
    this.persist();
  }

  clear(key: keyof DashboardFilters, value?: string): void {
    if (!value || key === 'period') {
      this.set(key, '');
      return;
    }
    this.set(
      key,
      joinFilterValues(splitFilterValues(this.filters()[key]).filter((item) => item !== value)),
    );
  }

  toggle(key: Exclude<keyof DashboardFilters, 'period'>, value: string): void {
    this.set(key, toggleFilterValue(this.filters()[key], value));
  }

  reset(): void {
    if (!this.active()) {
      return;
    }

    this.filters.set(emptyFilters());
    this.persist();
  }

  private persist(): void {
    this.workspace?.updateFilters(this.filters());
  }
}
