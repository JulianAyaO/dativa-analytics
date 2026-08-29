import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, resource } from '@angular/core';
import { DashboardFilterStore } from '../../filters/dashboard-filter.store';
import { WidgetInstance } from '../widget.models';
import { familyForWidget } from '../widget.registry';
import { WidgetQueryService } from '../query/widget-query.service';
import { parseWidgetQuery, serializeWidgetQuery, toWidgetQuery } from '../query/widget-query.codec';
import { WidgetData } from '../query/widget-query.models';
import { WidgetStatus } from './widget-status';
import { KpiRenderer } from './kpi/kpi-renderer';
import { SeriesRenderer } from './series/series-renderer';
import { CompositionRenderer } from './composition/composition-renderer';
import { TableRenderer } from './table/table-renderer';
import { RankingRenderer } from './ranking/ranking-renderer';
import { ProgressRenderer } from './progress/progress-renderer';
import {
  ExplorerQuery,
  rankingExplorerExtra,
  toExplorerQuery,
} from '../../../explorer/explorer-query';
import { RealtimeClient } from '../../../../core/realtime/realtime.client';
import { WidgetSaleGate } from '../../../../core/realtime/widget-sale.gate';

type WidgetFrame =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: WidgetData; busy: boolean };

@Component({
  selector: 'dtv-widget-outlet',
  imports: [
    WidgetStatus,
    KpiRenderer,
    SeriesRenderer,
    CompositionRenderer,
    TableRenderer,
    RankingRenderer,
    ProgressRenderer,
  ],
  templateUrl: './widget-outlet.html',
  styleUrl: './widget-outlet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetOutlet {
  private readonly api = inject(WidgetQueryService);
  private readonly filters = inject(DashboardFilterStore);
  private readonly realtime = inject(RealtimeClient);
  private readonly sales = new WidgetSaleGate();

  readonly widget = input.required<WidgetInstance>();
  readonly live = input(true);
  readonly explore = output<ExplorerQuery>();

  protected readonly family = computed(() => familyForWidget(this.widget().type));
  protected readonly metric = computed(() => this.widget().config.metric);

  constructor() {
    effect(() => {
      if (!this.live()) {
        return;
      }
      this.sales.observe(this.realtime.event(), toWidgetQuery(this.widget(), this.filters.value()));
    });
  }

  protected readonly result = resource({
    params: () =>
      `${serializeWidgetQuery(this.widget(), this.filters.value())}\n#${this.live() ? this.sales.hits() : 0}`,
    loader: ({ params, abortSignal }) =>
      this.api.execute(parseWidgetQuery(params.slice(0, params.lastIndexOf('\n#'))), abortSignal),
  });

  protected readonly frame = computed((): WidgetFrame => {
    const status = this.result.status();
    if (status === 'error') {
      return {
        status: 'error',
        message: this.result.error()?.message ?? 'No se pudieron cargar los datos del widget.',
      };
    }

    if (!this.result.hasValue()) {
      return { status: 'loading' };
    }

    const value = this.result.value();
    if (!value) {
      return { status: 'loading' };
    }

    if (value.status === 'empty') {
      return { status: 'empty' };
    }

    if (value.status === 'error') {
      return { status: 'error', message: value.message };
    }

    return {
      status: 'ready',
      data: value.data,
      busy: this.result.isLoading(),
    };
  });

  protected readonly kpi = computed(() => asFamily(this.frame(), 'kpi'));
  protected readonly series = computed(() => asFamily(this.frame(), 'series'));
  protected readonly composition = computed(() => asFamily(this.frame(), 'composition'));
  protected readonly table = computed(() => asFamily(this.frame(), 'table'));
  protected readonly ranking = computed(() => asFamily(this.frame(), 'ranking'));
  protected readonly progress = computed(() => asFamily(this.frame(), 'progress'));

  protected readonly errorMessage = computed(() => {
    const frame = this.frame();
    return frame.status === 'error' ? frame.message : '';
  });

  protected readonly busy = computed(() => {
    const frame = this.frame();
    return frame.status === 'ready' && frame.busy;
  });

  protected reload(): void {
    this.result.reload();
  }

  protected exploreKpi(): void {
    this.explore.emit(toExplorerQuery(this.widget(), this.filters.value()));
  }

  protected exploreRanking(label: string): void {
    this.explore.emit(
      toExplorerQuery(
        this.widget(),
        this.filters.value(),
        rankingExplorerExtra(this.widget().config.dimension, label),
      ),
    );
  }
}

function asFamily<T extends WidgetData['family']>(
  frame: WidgetFrame,
  family: T,
): Extract<WidgetData, { family: T }> | null {
  if (frame.status !== 'ready' || frame.data.family !== family) {
    return null;
  }

  return frame.data as Extract<WidgetData, { family: T }>;
}
