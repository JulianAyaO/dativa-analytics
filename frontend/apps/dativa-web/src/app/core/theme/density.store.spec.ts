import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DensityStore } from './density.store';

describe('DensityStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-density');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('defaults to comfortable density', () => {
    const store = TestBed.inject(DensityStore);
    expect(store.mode()).toBe('comfortable');
    expect(document.documentElement.dataset['density']).toBe('comfortable');
  });

  it('persists compact density', () => {
    const store = TestBed.inject(DensityStore);
    store.setMode('compact');
    expect(store.mode()).toBe('compact');
    expect(localStorage.getItem('dativa.density')).toBe('compact');
    expect(document.documentElement.dataset['density']).toBe('compact');
  });
});
