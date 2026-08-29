import { booleanAttribute, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'button[dtvButton]',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    '[class]': 'hostClass()',
    '[attr.aria-busy]': 'loading() || null',
    '[disabled]': 'disabled() || loading()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(
    () =>
      `dtv-button dtv-button--${this.variant()} dtv-button--${this.size()}`,
  );
}
