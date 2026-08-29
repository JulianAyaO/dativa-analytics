import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type DensityMode = 'comfortable' | 'compact';

const DENSITY_KEY = 'dativa.density';

@Injectable({ providedIn: 'root' })
export class DensityStore {
  private readonly document = inject(DOCUMENT);

  readonly mode = signal<DensityMode>(readDensity());

  constructor() {
    this.apply(this.mode());
  }

  setMode(mode: DensityMode): void {
    this.mode.set(mode);
    localStorage.setItem(DENSITY_KEY, mode);
    this.apply(mode);
  }

  private apply(mode: DensityMode): void {
    this.document.documentElement.dataset['density'] = mode;
  }
}

function readDensity(): DensityMode {
  const stored = localStorage.getItem(DENSITY_KEY);
  return stored === 'compact' ? 'compact' : 'comfortable';
}
