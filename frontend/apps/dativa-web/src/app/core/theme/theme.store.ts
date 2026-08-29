import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'dativa.theme';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);

  readonly mode = signal<ThemeMode>(readTheme());
  readonly resolved = computed(() => resolveTheme(this.mode()));

  constructor() {
    this.apply(this.resolved());
    this.document.defaultView
      ?.matchMedia?.('(prefers-color-scheme: dark)')
      ?.addEventListener('change', () => {
        if (this.mode() === 'system') {
          this.apply(resolveTheme('system'));
        }
      });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(THEME_KEY, mode);
    this.apply(resolveTheme(mode));
  }

  toggleLightDark(): void {
    this.setMode(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: 'light' | 'dark'): void {
    this.document.documentElement.dataset['theme'] = theme;
  }
}

function readTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') {
    return mode;
  }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}
