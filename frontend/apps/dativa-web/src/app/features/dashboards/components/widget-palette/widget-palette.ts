import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WIDGET_CATALOG } from '../../widgets/widget.registry';
import { WidgetType } from '../../widgets/widget.models';

@Component({
  selector: 'dtv-widget-palette',
  templateUrl: './widget-palette.html',
  styleUrl: './widget-palette.scss',
  host: {
    '[class.dtv-palette--compact]': 'compact()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetPalette {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly compact = input(false, { transform: booleanAttribute });
  readonly add = output<WidgetType>();

  protected readonly catalog = WIDGET_CATALOG;

  protected addWidget(type: WidgetType): void {
    if (!this.disabled()) {
      this.add.emit(type);
    }
  }
}
