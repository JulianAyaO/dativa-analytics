import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
  });

  it('authenticates a demo analyst', async () => {
    const store = TestBed.inject(AuthStore);

    await store.login({
      email: 'analyst@dativa.app',
      password: 'Dativa123!',
    });

    expect(store.isAuthenticated()).toBe(true);
    expect(store.canEdit()).toBe(true);
    expect(store.isAdmin()).toBe(false);
    expect(store.user()?.name).toBe('Luis Analista');
  });

  it('rejects invalid credentials', async () => {
    const store = TestBed.inject(AuthStore);

    await expect(
      store.login({ email: 'analyst@dativa.app', password: 'wrong' }),
    ).rejects.toThrow();

    expect(store.isAuthenticated()).toBe(false);
  });

  it('clears the session on logout', async () => {
    const store = TestBed.inject(AuthStore);
    await store.login({ email: 'admin@dativa.app', password: 'Dativa123!' });

    store.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('dativa.session')).toBeNull();
  });

  it('does not allow a viewer to edit dashboards', async () => {
    const store = TestBed.inject(AuthStore);

    await store.login({
      email: 'viewer@dativa.app',
      password: 'Dativa123!',
    });

    expect(store.isAuthenticated()).toBe(true);
    expect(store.canEdit()).toBe(false);
    expect(store.isAdmin()).toBe(false);
  });
});
