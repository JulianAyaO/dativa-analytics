import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  authenticateMock,
  createManagedUser,
  listManagedUsers,
  registerMock,
  updateManagedUser,
} from './mock-users';

describe('mock-users', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('registers a viewer with a unique email', () => {
    const user = registerMock({
      name: 'Nueva Cuenta',
      email: 'nueva@dativa.app',
      password: 'Clave1234',
    });

    expect(user.role).toBe('VIEWER');
    expect(listManagedUsers().some((item) => item.email === 'nueva@dativa.app')).toBe(true);
  });

  it('rejects a duplicate email', () => {
    expect(() =>
      registerMock({
        name: 'Ana',
        email: 'admin@dativa.app',
        password: 'Clave1234',
      }),
    ).toThrow(/Ya existe/);
  });

  it('rejects inactive accounts on login', () => {
    const created = createManagedUser({
      name: 'Inactivo',
      email: 'off@dativa.app',
      password: 'Clave1234',
      role: 'VIEWER',
    });
    updateManagedUser(created.id, { active: false });

    expect(() => authenticateMock('off@dativa.app', 'Clave1234')).toThrow(/desactivada/);
  });

  it('refuses to deactivate the last admin', () => {
    expect(() => updateManagedUser('usr_admin', { active: false })).toThrow(/último administrador/);
  });
});
