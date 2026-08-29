import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Badge } from '@dativa/ui';
import { ThemeStore } from '../../../../../core/theme/theme.store';
import { MetricId } from '../../widget.models';
import { KpiWidgetData } from '../../query/widget-query.models';
import { formatChange, formatMetric } from '../../query/format-metric';
import { WidgetChart } from '../chart/widget-chart';
import { readChartTheme } from '../chart/chart-theme';
import { buildSparklineOption } from './sparkline-option';

@Component({
  selector: 'dtv-kpi-renderer',
  imports: [Badge, WidgetChart],
  templateUrl: './kpi-renderer.html',
  styleUrl: './kpi-renderer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiRenderer {
  private readonly theme = inject(ThemeStore);

  readonly data = input.required<KpiWidgetData>();
  readonly metric = input.required<MetricId>();
  readonly explore = output<void>();

  protected readonly value = computed(() => formatMetric(this.data().value, this.metric()));
  protected readonly change = computed(() => formatChange(this.data().changePct));
  protected readonly tone = computed(() => {
    const change = this.data().changePct;
    if (change === null) {
      return 'neutral' as const;
    }

    return change >= 0 ? ('success' as const) : ('danger' as const);
  });

  protected readonly options = computed(() => {
    this.theme.resolved();
    return buildSparklineOption(this.data().sparkline, this.metric(), readChartTheme());
  });
}
