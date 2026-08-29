import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Menu, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { WidgetInstance } from '../widget.models';
import { WIDGET_CATALOG } from '../widget.registry';
import { WidgetOutlet } from '../renderers/widget-outlet';
import { ExplorerQuery } from '../../../explorer/explorer-query';

@Component({
  selector: 'dtv-widget-host',
  imports: [Menu, MenuItem, MenuTrigger, WidgetOutlet],
  templateUrl: './widget-host.html',
  styleUrl: './widget-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dtv-widget-host--selected]': 'selected()',
    '[class.dtv-widget-host--readonly]': '!editable()',
    role: 'group',
    '[attr.aria-label]': 'widget().title',
    '[attr.aria-selected]': 'selected()',
  },
})
export class WidgetHost {
  readonly widget = input.required<WidgetInstance>();
  readonly selected = input(false);
  readonly editable = input(true);

  readonly selectWidget = output<string>();
  readonly duplicate = output<string>();
  readonly remove = output<string>();
  readonly explore = output<ExplorerQuery>();

  protected readonly definition = computed(
    () => WIDGET_CATALOG.find((item) => item.type === this.widget().type),
  );

  protected onSelect(): void {
    this.selectWidget.emit(this.widget().id);
  }
}
