import { Component, computed, input, model, output } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';

let nextSelectId = 0;

@Component({
  selector: 'dtv-select',
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class Select implements FormValueControl<string> {
  readonly value = model('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly required = input(false);
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touch = output<void>();

  readonly label = input('');
  readonly hint = input('');
  readonly selectId = input(`dtv-select-${++nextSelectId}`);

  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint()) {
      ids.push(`${this.selectId()}-hint`);
    }
    if (this.showError()) {
      ids.push(`${this.selectId()}-error`);
    }
    return ids.join(' ') || null;
  });

  protected readonly errorText = computed(() => this.errors()[0]?.message ?? '');

  protected readonly showError = computed(
    () => this.invalid() && this.touched() && Boolean(this.errorText()),
  );

  protected onChange(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }

  protected onBlur(): void {
    this.touch.emit();
  }
}
