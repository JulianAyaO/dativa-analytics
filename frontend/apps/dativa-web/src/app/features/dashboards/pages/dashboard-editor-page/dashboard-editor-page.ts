import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Badge, Button, EmptyState, Input, Loading } from '@dativa/ui';
import { WidgetConfig, WidgetInstance, WidgetType } from '../../widgets/widget.models';
import { DashboardWorkspaceStore } from '../../state/dashboard-workspace.store';
import { WidgetPalette } from '../../components/widget-palette/widget-palette';
import { DashboardCanvas } from '../../components/dashboard-canvas/dashboard-canvas';
import { WidgetConfigPanel } from '../../components/widget-config-panel/widget-config-panel';
import { DashboardFilterStore } from '../../filters/dashboard-filter.store';
import { DashboardFilterBar } from '../../filters/dashboard-filter-bar';
import { ExplorerQuery, explorerQueryParams } from '../../../explorer/explorer-query';

const PALETTE_DEFAULT = 256;
const CONFIG_DEFAULT = 320;
const PALETTE_MIN = 56;
const PALETTE_MAX = 320;
const CONFIG_MIN = 56;
const CONFIG_MAX = 420;
const COMPACT_AT = 148;

@Component({
  selector: 'dtv-dashboard-editor-page',
  imports: [
    Button,
    Badge,
    Input,
    Loading,
    EmptyState,
    WidgetPalette,
    DashboardCanvas,
    WidgetConfigPanel,
    DashboardFilterBar,
  ],
  providers: [DashboardWorkspaceStore, DashboardFilterStore],
  templateUrl: './dashboard-editor-page.html',
  styleUrl: './dashboard-editor-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardEditorPage {
  private readonly router = inject(Router);
  private readonly canvas = viewChild(DashboardCanvas);
  protected readonly filters = inject(DashboardFilterStore);
  protected readonly store = inject(DashboardWorkspaceStore);

  readonly id = input.required<string>();
  protected readonly justSaved = signal(false);
  protected readonly paletteWidth = signal(PALETTE_DEFAULT);
  protected readonly configWidth = signal(CONFIG_DEFAULT);
  protected readonly resizing = signal(false);
  protected readonly paletteCompact = computed(() => this.paletteWidth() < COMPACT_AT);
  protected readonly configCompact = computed(() => this.configWidth() < COMPACT_AT);

  private drag: { side: 'palette' | 'config'; startX: number; startWidth: number } | null = null;

  constructor() {
    effect(() => {
      const id = this.id();
      void this.open(id);
    });

    effect(() => {
      if (this.store.dirty()) {
        this.justSaved.set(false);
      }
    });
  }

  protected addWidget(type: WidgetType): void {
    this.canvas()?.placeAndCreate(type);
  }

  protected startResize(side: 'palette' | 'config', event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = {
      side,
      startX: event.clientX,
      startWidth: side === 'palette' ? this.paletteWidth() : this.configWidth(),
    };
    this.resizing.set(true);
  }

  protected onResizeMove(event: PointerEvent): void {
    if (!this.drag) {
      return;
    }

    const delta = event.clientX - this.drag.startX;
    if (this.drag.side === 'palette') {
      this.paletteWidth.set(clamp(this.drag.startWidth + delta, PALETTE_MIN, PALETTE_MAX));
    } else {
      this.configWidth.set(clamp(this.drag.startWidth - delta, CONFIG_MIN, CONFIG_MAX));
    }
  }

  protected stopResize(): void {
    if (!this.drag) {
      return;
    }

    this.drag = null;
    this.resizing.set(false);
    this.canvas()?.relayout();
  }

  protected togglePanel(side: 'palette' | 'config'): void {
    if (side === 'palette') {
      this.paletteWidth.update((width) => (width > PALETTE_MIN + 8 ? PALETTE_MIN : PALETTE_DEFAULT));
    } else {
      this.configWidth.update((width) => (width > CONFIG_MIN + 8 ? CONFIG_MIN : CONFIG_DEFAULT));
    }
    this.canvas()?.relayout();
  }

  protected onPlacedWidget(widget: WidgetInstance): void {
    this.store.addWidget(widget);
  }

  protected updateTitle(title: string): void {
    const widgetId = this.store.selectedWidgetId();
    if (widgetId) {
      this.store.updateWidgetTitle(widgetId, title);
    }
  }

  protected updateConfig(config: WidgetConfig): void {
    const widgetId = this.store.selectedWidgetId();
    if (widgetId) {
      this.store.updateWidgetConfig(widgetId, config);
    }
  }

  protected async save(): Promise<void> {
    const ok = await this.store.save();
    if (ok) {
      this.justSaved.set(true);
    }
  }

  protected discard(): void {
    if (!this.store.dirty()) {
      return;
    }

    if (globalThis.confirm('¿Descartar los cambios no guardados?')) {
      this.store.discard();
      this.filters.hydrate(this.store.current()?.filters);
    }
  }

  protected retry(): void {
    void this.open(this.id());
  }

  private async open(id: string): Promise<void> {
    await this.store.load(id);
    this.filters.hydrate(this.store.current()?.filters);
  }

  confirmLeave(): boolean {
    if (!this.store.dirty()) {
      return true;
    }

    return globalThis.confirm('Hay cambios sin guardar. ¿Salir y descartarlos?');
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (this.store.dirty()) {
        void this.save();
      }
    }
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/dashboards');
  }

  protected openView(): void {
    const dashboard = this.store.current();
    if (dashboard) {
      void this.router.navigate(['/dashboards', dashboard.id]);
    }
  }

  protected openExplorer(query: ExplorerQuery): void {
    void this.router.navigate(['/explorer'], { queryParams: explorerQueryParams(query) });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
