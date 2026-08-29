import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Input } from './input';
import type { ValidationError } from '@angular/forms/signals';

@Component({
  imports: [Input],
  template: `
    <dtv-input
      label="Correo"
      hint="Mínimo 8 caracteres, con al menos una letra y un número."
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
    />
  `,
})
class InputHost {
  readonly invalid = signal(true);
  readonly touched = signal(false);
  readonly errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([
    { kind: 'required', message: 'El correo es obligatorio' },
  ]);
}

describe('Input', () => {
  let fixture: ComponentFixture<InputHost>;
  let host: InputHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(InputHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('does not show validation errors until the field is touched', () => {
    const control = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(control.getAttribute('aria-invalid')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('El correo es obligatorio');
  });

  it('keeps the hint out of the accessible name', async () => {
    host.touched.set(false);
    await fixture.whenStable();
    fixture.detectChanges();
    const control = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const labelled = [...(control.labels ?? [])].map((node) => node.textContent ?? '').join(' ');
    expect(labelled).toContain('Correo');
    expect(labelled).not.toContain('Mínimo 8 caracteres');
  });

  it('shows the error after the field is touched', async () => {
    host.touched.set(true);
    await fixture.whenStable();
    fixture.detectChanges();

    const control = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('El correo es obligatorio');
  });
});
