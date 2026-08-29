import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button, Loading } from '@dativa/ui';

@Component({
  selector: 'dtv-widget-status',
  imports: [Button, Loading],
  templateUrl: './widget-status.html',
  styleUrl: './widget-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetStatus {
  readonly status = input.required<'loading' | 'empty' | 'error'>();
  readonly message = input('');
  readonly retry = output<void>();
}
