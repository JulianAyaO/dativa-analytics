import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('toggles between light and dark and persists the choice', () => {
    const store = TestBed.inject(ThemeStore);
    store.setMode('light');
    store.toggleLightDark();
    expect(store.mode()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('dativa.theme')).toBe('dark');

    store.toggleLightDark();
    expect(store.mode()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
