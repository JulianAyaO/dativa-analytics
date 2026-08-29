import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeStore } from './core/theme/theme.store';
import { DensityStore } from './core/theme/density.store';

@Component({
  imports: [RouterOutlet],
  selector: 'dtv-root',
  template: '<router-outlet />',
})
export class App {
  constructor() {
    inject(ThemeStore);
    inject(DensityStore);
  }
}
