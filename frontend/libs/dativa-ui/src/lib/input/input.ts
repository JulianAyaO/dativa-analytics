import {
  booleanAttribute,
  Component,
  computed,
  input,
  model,
  output,
  viewChild,
  ElementRef,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';

let nextInputId = 0;

@Component({
  selector: 'dtv-input',
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class Input implements FormValueControl<string> {
  readonly value = model('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly required = input(false);
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touch = output<void>();

  readonly label = input('');
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly hint = input('');
  readonly type = input<'text' | 'email' | 'password' | 'search'>('text');
  readonly autocomplete = input('');
  readonly placeholder = input('');
  readonly inputId = input(`dtv-input-${++nextInputId}`);

  private readonly nativeInput = viewChild<ElementRef<HTMLInputElement>>('control');

  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint()) {
      ids.push(`${this.inputId()}-hint`);
    }
    if (this.showError()) {
      ids.push(`${this.inputId()}-error`);
    }
    return ids.join(' ') || null;
  });

  protected readonly errorText = computed(
    () => this.errors()[0]?.message ?? '',
  );

  protected readonly showError = computed(
    () => this.invalid() && this.touched() && Boolean(this.errorText()),
  );

  focus(options?: FocusOptions): void {
    this.nativeInput()?.nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    this.touch.emit();
  }
}
