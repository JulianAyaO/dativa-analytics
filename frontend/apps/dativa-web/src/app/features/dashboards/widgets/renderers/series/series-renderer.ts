import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ThemeStore } from '../../../../../core/theme/theme.store';
import { MetricId } from '../../widget.models';
import { SeriesWidgetData } from '../../query/widget-query.models';
import { WidgetChart } from '../chart/widget-chart';
import { readChartTheme } from '../chart/chart-theme';
import { buildSeriesOption } from './series-option';

@Component({
  selector: 'dtv-series-renderer',
  imports: [WidgetChart],
  template: `<dtv-widget-chart [options]="options()" />`,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeriesRenderer {
  private readonly theme = inject(ThemeStore);

  readonly data = input.required<SeriesWidgetData>();
  readonly metric = input.required<MetricId>();

  protected readonly options = computed(() => {
    this.theme.resolved();
    return buildSeriesOption(this.data(), this.metric(), readChartTheme());
  });
}
