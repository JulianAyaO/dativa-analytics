import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, output, resource } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { RealtimeClient } from '../../../../core/realtime/realtime.client';
import { WidgetSaleGate } from '../../../../core/realtime/widget-sale.gate';
import {
  ExplorerQuery,
  rankingExplorerExtra,
  toExplorerQuery,
} from '../../../explorer/explorer-query';
import { DashboardFilterStore } from '../../filters/dashboard-filter.store';
import { WidgetInstance } from '../widget.models';
import { familyForWidget } from '../widget.registry';
import { parseWidgetQuery, serializeWidgetQuery, toWidgetQuery } from '../query/widget-query.codec';
import { WidgetData, WidgetResult } from '../query/widget-query.models';
import { WidgetQueryService } from '../query/widget-query.service';
import { CompositionRenderer } from './composition/composition-renderer';
import { KpiRenderer } from './kpi/kpi-renderer';
import { ProgressRenderer } from './progress/progress-renderer';
import { RankingRenderer } from './ranking/ranking-renderer';
import { SeriesRenderer } from './series/series-renderer';
import { TableRenderer } from './table/table-renderer';
import { WidgetStatus } from './widget-status';

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
      if (!this.live() || environment.useMockAuth) {
        return;
      }
      this.sales.observe(this.realtime.event(), toWidgetQuery(this.widget(), this.filters.value()));
    });
  }

  protected readonly result = resource({
    params: () => {
      const query = serializeWidgetQuery(this.widget(), this.filters.value());
      if (!this.live() || environment.useMockAuth) {
        return query;
      }
      return `${query}\n#${this.sales.hits()}`;
    },
    loader: ({ params, abortSignal }) => {
      const raw = params.includes('\n#') ? params.slice(0, params.lastIndexOf('\n#')) : params;
      return this.api.execute(parseWidgetQuery(raw), abortSignal);
    },
  });

  private readonly cachedData = linkedSignal<WidgetResult | null, WidgetData | null>({
    source: () => (this.result.hasValue() ? this.result.value() : null),
    computation: (value, previous) => {
      if (value?.status === 'ready') {
        return value.data;
      }
      return previous?.value ?? null;
    },
  });

  protected readonly frame = computed((): WidgetFrame => {
    const current = this.result.hasValue() ? this.result.value() : null;
    if (this.result.status() === 'error' && !current) {
      return {
        status: 'error',
        message: this.result.error()?.message ?? 'No se pudieron cargar los datos del widget.',
      };
    }

    if (current?.status === 'error') {
      return { status: 'error', message: current.message };
    }

    if (current?.status === 'empty') {
      return { status: 'empty' };
    }

    if (current?.status === 'ready') {
      return {
        status: 'ready',
        data: current.data,
        busy: this.result.isLoading(),
      };
    }

    const cached = this.cachedData();
    if (cached) {
      return { status: 'ready', data: cached, busy: true };
    }

    return { status: 'loading' };
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
