import { ChangeDetectionStrategy, Component, HostListener, inject, input, output, signal } from '@angular/core';
import { Badge, Button, Select } from '@dativa/ui';
import { DashboardFilterStore } from './dashboard-filter.store';
import { DashboardFilters, FILTER_PERIOD_OPTIONS } from './dashboard-filters';
import { filterFieldOptions } from './dashboard-filter.options';
import { FilterPreset } from '../models/dashboard.models';
import { FilterPicker } from './filter-picker';

type PickerKey = 'region' | 'category' | 'product' | 'seller';

@Component({
  selector: 'dtv-dashboard-filter-bar',
  imports: [Badge, Button, Select, FilterPicker],
  templateUrl: './dashboard-filter-bar.html',
  styleUrl: './dashboard-filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardFilterBar {
  readonly periodEmptyLabel = input('Periodo del widget');
  readonly ariaLabel = input('Filtros del dashboard');
  readonly presets = input<readonly FilterPreset[]>([]);
  readonly canSavePreset = input(false);

  readonly savePreset = output<string>();
  readonly removePreset = output<string>();

  protected readonly filters = inject(DashboardFilterStore);
  protected readonly periods = FILTER_PERIOD_OPTIONS;
  protected readonly fields = filterFieldOptions();
  protected readonly openKey = signal<PickerKey | null>(null);

  protected onSelect(key: keyof DashboardFilters, value: string): void {
    this.filters.set(key, value);
  }

  protected onOpen(key: PickerKey, open: boolean): void {
    this.openKey.set(open ? key : null);
  }

  protected applyPreset(preset: FilterPreset): void {
    this.filters.hydrate(preset.filters);
    this.openKey.set(null);
  }

  protected onSavePreset(): void {
    const name = globalThis.prompt('Nombre de la vista de filtros');
    if (name?.trim()) {
      this.savePreset.emit(name.trim());
    }
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.openKey.set(null);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.openKey.set(null);
  }
}
