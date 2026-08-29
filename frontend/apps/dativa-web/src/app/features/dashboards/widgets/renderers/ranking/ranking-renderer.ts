import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { ECElementEvent } from 'echarts/core';
import { ThemeStore } from '../../../../../core/theme/theme.store';
import { MetricId } from '../../widget.models';
import { RankingWidgetData } from '../../query/widget-query.models';
import { WidgetChart } from '../chart/widget-chart';
import { readChartTheme } from '../chart/chart-theme';
import { buildRankingOption } from './ranking-option';

@Component({
  selector: 'dtv-ranking-renderer',
  imports: [WidgetChart],
  template: `
    <div class="dtv-sr-only">
      @for (item of data().items; track item.key) {
        <button type="button" (click)="explore.emit(item.key); $event.stopPropagation()">
          Ver {{ item.label }} en el explorador
        </button>
      }
    </div>
    <dtv-widget-chart [options]="options()" (chartClick)="onChartClick($event)" />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingRenderer {
  private readonly theme = inject(ThemeStore);

  readonly data = input.required<RankingWidgetData>();
  readonly metric = input.required<MetricId>();
  readonly explore = output<string>();

  protected readonly options = computed(() => {
    this.theme.resolved();
    return buildRankingOption(this.data(), this.metric(), readChartTheme());
  });

  protected onChartClick(event: ECElementEvent): void {
    const name = event.name?.trim();
    if (!name) {
      return;
    }

    const match = this.data().items.find((item) => item.label === name || item.key === name);
    this.explore.emit(match?.key || name);
  }
}
