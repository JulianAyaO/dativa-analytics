import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MetricId } from '../../widget.models';
import { TableWidgetData } from '../../query/widget-query.models';
import { formatMetric, formatShare } from '../../query/format-metric';

@Component({
  selector: 'dtv-table-renderer',
  templateUrl: './table-renderer.html',
  styleUrl: './table-renderer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableRenderer {
  readonly data = input.required<TableWidgetData>();
  readonly metric = input.required<MetricId>();

  protected readonly rows = computed(() =>
    this.data().rows.map((row) => ({
      ...row,
      valueLabel: formatMetric(row.value, this.metric()),
      shareLabel: formatShare(row.share),
    })),
  );
}
