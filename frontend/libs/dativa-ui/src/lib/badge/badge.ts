import { Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'dtv-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  host: {
    '[class]': '"dtv-badge dtv-badge--" + tone()',
  },
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
}
