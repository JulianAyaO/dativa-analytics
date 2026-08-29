import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Input, Select } from '@dativa/ui';
import { WidgetConfig, WidgetInstance } from '../../widgets/widget.models';
import { usesDimension, usesTopN } from '../../widgets/widget.factory';
import { WIDGET_CATALOG } from '../../widgets/widget.registry';
import {
  DATASET_OPTIONS,
  DIMENSION_OPTIONS,
  METRIC_OPTIONS,
  PERIOD_OPTIONS,
  TOP_N_OPTIONS,
} from '../../widgets/widget.schema';

@Component({
  selector: 'dtv-widget-config-panel',
  imports: [Input, Select],
  templateUrl: './widget-config-panel.html',
  styleUrl: './widget-config-panel.scss',
  host: {
    '[class.dtv-config--compact]': 'compact()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetConfigPanel {
  readonly widget = input<WidgetInstance | null>(null);
  readonly compact = input(false, { transform: booleanAttribute });

  readonly titleChange = output<string>();
  readonly configChange = output<WidgetConfig>();

  protected readonly datasets = DATASET_OPTIONS;
  protected readonly metrics = METRIC_OPTIONS;
  protected readonly dimensions = DIMENSION_OPTIONS;
  protected readonly periods = PERIOD_OPTIONS;
  protected readonly topN = TOP_N_OPTIONS;

  protected readonly typeLabel = computed(() => {
    const widget = this.widget();
    if (!widget) {
      return '';
    }

    return WIDGET_CATALOG.find((item) => item.type === widget.type)?.label ?? widget.type;
  });

  protected readonly showDimension = computed(() => {
    const widget = this.widget();
    return widget ? usesDimension(widget.type) : false;
  });

  protected readonly showTopN = computed(() => {
    const widget = this.widget();
    return widget ? usesTopN(widget.type) : false;
  });

  protected onTitle(value: string): void {
    this.titleChange.emit(value);
  }

  protected onDataset(value: string): void {
    this.patchConfig({ dataset: value as WidgetConfig['dataset'] });
  }

  protected onMetric(value: string): void {
    this.patchConfig({ metric: value as WidgetConfig['metric'] });
  }

  protected onDimension(value: string): void {
    this.patchConfig({ dimension: value as WidgetConfig['dimension'] });
  }

  protected onPeriod(value: string): void {
    this.patchConfig({ period: value as WidgetConfig['period'] });
  }

  protected onTopN(value: string): void {
    this.patchConfig({ topN: Number(value) });
  }

  protected patchConfig(partial: Partial<WidgetConfig>): void {
    const widget = this.widget();
    if (!widget) {
      return;
    }

    this.configChange.emit({ ...widget.config, ...partial });
  }
}
