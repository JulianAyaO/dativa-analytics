import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Button, ButtonVariant } from './button';

@Component({
  imports: [Button],
  template: `<button dtvButton [variant]="variant()" [loading]="loading()">Guardar</button>`,
})
class ButtonHost {
  readonly variant = signal<ButtonVariant>('primary');
  readonly loading = signal(false);
}

describe('Button', () => {
  let fixture: ComponentFixture<ButtonHost>;
  let host: ButtonHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonHost],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders the projected label', () => {
    expect(fixture.nativeElement.textContent).toContain('Guardar');
  });

  it('applies the variant class', async () => {
    host.variant.set('secondary');
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.className).toContain('dtv-button--secondary');
  });

  it('exposes a loading state to assistive tech', async () => {
    host.loading.set(true);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.disabled).toBe(true);
  });
});
