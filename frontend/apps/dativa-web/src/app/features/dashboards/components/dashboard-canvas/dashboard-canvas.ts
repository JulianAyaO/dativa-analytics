import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  CompactType,
  DisplayGrid,
  Gridster,
  GridsterConfig,
  GridsterItem,
  GridType,
} from 'angular-gridster2';
import { WidgetInstance, WidgetType } from '../../widgets/widget.models';
import { createWidget } from '../../widgets/widget.factory';
import { WidgetHost } from '../../widgets/widget-host/widget-host';
import { EmptyState } from '@dativa/ui';
import { ExplorerQuery } from '../../../explorer/explorer-query';

@Component({
  selector: 'dtv-dashboard-canvas',
  imports: [Gridster, GridsterItem, WidgetHost, EmptyState],
  templateUrl: './dashboard-canvas.html',
  styleUrl: './dashboard-canvas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCanvas {
  private readonly grid = viewChild(Gridster);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private relayoutFrame = 0;

  readonly widgets = input.required<WidgetInstance[]>();
  readonly selectedId = input<string | null>(null);
  readonly editable = input(true);

  readonly selectWidget = output<string | null>();
  readonly duplicateWidget = output<string>();
  readonly removeWidget = output<string>();
  readonly layoutChange = output<void>();
  readonly addWidget = output<WidgetInstance>();
  readonly explore = output<ExplorerQuery>();

  private readonly notifyLayoutChange = (): void => this.layoutChange.emit();

  constructor() {
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      const observer = new ResizeObserver(() => this.scheduleRelayout());
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        if (this.relayoutFrame) {
          globalThis.cancelAnimationFrame(this.relayoutFrame);
          this.relayoutFrame = 0;
        }
      });
    });
  }

  protected readonly options = computed((): GridsterConfig => {
    const editable = this.editable();

    return {
      gridType: GridType.ScrollVertical,
      compactType: CompactType.None,
      displayGrid: editable ? DisplayGrid.OnDragAndResize : DisplayGrid.None,
      setGridSize: true,
      margin: 12,
      outerMargin: true,
      minCols: 12,
      maxCols: 12,
      minRows: 6,
      maxRows: 200,
      defaultItemCols: 4,
      defaultItemRows: 3,
      minItemCols: 2,
      minItemRows: 2,
      maxItemCols: 12,
      scrollToNewItems: true,
      disableScrollHorizontal: true,
      pushItems: true,
      disablePushOnResize: false,
      disableWarnings: true,
      swap: false,
      draggable: {
        enabled: editable,
        ignoreContent: true,
        dragHandleClass: 'dtv-widget__drag',
        stop: this.notifyLayoutChange,
      },
      resizable: {
        enabled: editable,
        stop: this.notifyLayoutChange,
      },
      itemChangeCallback: this.notifyLayoutChange,
    };
  });

  protected onBackgroundClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).tagName.toLowerCase() === 'gridster') {
      this.selectWidget.emit(null);
    }
  }

  placeAndCreate(type: WidgetType): WidgetInstance {
    const widget = createWidget(type);
    this.grid()?.api.getNextPossiblePosition(widget.layout);
    this.addWidget.emit(widget);
    return widget;
  }

  relayout(): void {
    this.grid()?.api.resize();
  }

  private scheduleRelayout(): void {
    if (this.relayoutFrame !== 0) {
      return;
    }

    this.relayoutFrame = globalThis.requestAnimationFrame(() => {
      this.relayoutFrame = 0;
      this.relayout();
    });
  }
}
