import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ThemeStore } from '../../../../../core/theme/theme.store';
import { MetricId } from '../../widget.models';
import { CompositionWidgetData } from '../../query/widget-query.models';
import { WidgetChart } from '../chart/widget-chart';
import { readChartTheme } from '../chart/chart-theme';
import { buildCompositionOption } from './composition-option';

@Component({
  selector: 'dtv-composition-renderer',
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
export class CompositionRenderer {
  private readonly theme = inject(ThemeStore);

  readonly data = input.required<CompositionWidgetData>();
  readonly metric = input.required<MetricId>();

  protected readonly options = computed(() => {
    this.theme.resolved();
    return buildCompositionOption(this.data(), this.metric(), readChartTheme());
  });
}
