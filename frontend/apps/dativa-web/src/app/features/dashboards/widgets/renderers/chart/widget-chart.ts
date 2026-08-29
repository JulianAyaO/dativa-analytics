import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';

@Component({
  selector: 'dtv-widget-chart',
  imports: [NgxEchartsDirective],
  template: `
    <div
      echarts
      class="dtv-widget-chart__canvas"
      [options]="options()"
      [autoResize]="true"
      (chartClick)="chartClick.emit($event)"
    ></div>
  `,
  styleUrl: './widget-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dtv-widget-chart--compact]': 'compact()',
  },
})
export class WidgetChart {
  readonly options = input.required<EChartsCoreOption>();
  readonly compact = input(false);
  readonly chartClick = output<ECElementEvent>();
}
