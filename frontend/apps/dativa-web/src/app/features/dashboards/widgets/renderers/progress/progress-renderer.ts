import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MetricId } from '../../widget.models';
import { ProgressWidgetData } from '../../query/widget-query.models';
import { formatMetric, formatShare } from '../../query/format-metric';

@Component({
  selector: 'dtv-progress-renderer',
  templateUrl: './progress-renderer.html',
  styleUrl: './progress-renderer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressRenderer {
  readonly data = input.required<ProgressWidgetData>();
  readonly metric = input.required<MetricId>();

  protected readonly ratioLabel = computed(() => formatShare(this.data().ratio));
  protected readonly valueLabel = computed(() => formatMetric(this.data().value, this.metric()));
  protected readonly targetLabel = computed(() => formatMetric(this.data().target, this.metric()));
  protected readonly barWidth = computed(() => Math.min(100, Math.max(0, this.data().ratio * 100)));
  protected readonly overTarget = computed(() => this.data().ratio >= 1);
}
