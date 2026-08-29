import { Component, inject } from '@angular/core';
import { ThemeStore } from './theme.store';

@Component({
  selector: 'dtv-theme-toggle',
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeStore);
}
