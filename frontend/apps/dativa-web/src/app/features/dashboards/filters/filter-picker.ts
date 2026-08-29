import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { splitFilterValues } from './dashboard-filters';

@Component({
  selector: 'dtv-filter-picker',
  template: `
    <div class="dtv-picker" [class.dtv-picker--open]="open()">
      <span class="dtv-picker__label" [id]="labelId()">{{ label() }}</span>
      <button
        class="dtv-picker__trigger"
        type="button"
        [id]="triggerId()"
        [attr.aria-labelledby]="labelId() + ' ' + triggerId()"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="toggleOpen(); $event.stopPropagation()"
      >
        {{ summary() }}
      </button>
      @if (open()) {
        <div class="dtv-picker__panel" role="listbox" [attr.aria-multiselectable]="true" [attr.aria-label]="label()" (click)="$event.stopPropagation()">
          @for (option of options(); track option.value) {
            <label class="dtv-picker__option">
              <input
                type="checkbox"
                [checked]="selected().includes(option.value)"
                (change)="pick(option.value)"
              />
              {{ option.label }}
            </label>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .dtv-picker {
      position: relative;
      display: grid;
      gap: 0.35rem;
    }

    .dtv-picker__label {
      font-size: var(--dtv-type-sm);
      font-weight: 600;
    }

    .dtv-picker__trigger {
      display: flex;
      align-items: center;
      width: 100%;
      min-height: var(--dtv-control-height);
      padding: 0 0.85rem;
      overflow: hidden;
      border: 1px solid var(--dtv-color-border-strong);
      border-radius: var(--dtv-radius-sm);
      background: var(--dtv-color-surface);
      color: var(--dtv-color-text);
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dtv-picker--open .dtv-picker__trigger,
    .dtv-picker__trigger:focus-visible {
      outline: none;
      box-shadow: var(--dtv-focus-ring);
      border-color: var(--dtv-color-primary);
    }

    .dtv-picker__panel {
      position: absolute;
      z-index: 6;
      top: calc(100% + 0.35rem);
      left: 0;
      right: 0;
      display: grid;
      gap: 0.15rem;
      max-height: 16rem;
      overflow: auto;
      padding: 0.45rem;
      border: 1px solid var(--dtv-color-border);
      border-radius: var(--dtv-radius-md);
      background: var(--dtv-color-surface);
      box-shadow: var(--dtv-shadow-md);
    }

    .dtv-picker__option {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.4rem 0.5rem;
      border-radius: var(--dtv-radius-sm);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .dtv-picker__option input {
      width: 1rem;
      height: 1rem;
      accent-color: var(--dtv-color-primary);
    }

    .dtv-picker__option:hover {
      background: var(--dtv-color-primary-soft);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterPicker {
  readonly label = input.required<string>();
  readonly emptyLabel = input('Todas');
  readonly value = input('');
  readonly options = input<readonly { value: string; label: string }[]>([]);
  readonly open = input(false);

  readonly valueChange = output<string>();
  readonly openChange = output<boolean>();

  private readonly uid = Math.random().toString(36).slice(2, 8);
  protected readonly triggerId = computed(() => `filtro-${this.uid}`);
  protected readonly labelId = computed(() => `filtro-${this.uid}-label`);
  protected readonly selected = computed(() => splitFilterValues(this.value()));
  protected readonly summary = computed(() => {
    const picked = this.selected();
    if (picked.length === 0) {
      return this.emptyLabel();
    }
    if (picked.length === 1) {
      return picked[0] ?? this.emptyLabel();
    }
    return `${picked.length} seleccionadas`;
  });

  protected toggleOpen(): void {
    this.openChange.emit(!this.open());
  }

  protected pick(value: string): void {
    const selected = this.selected();
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    this.valueChange.emit(next.join(','));
  }
}
