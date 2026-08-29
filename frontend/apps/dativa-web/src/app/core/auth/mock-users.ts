import { DEMO_ACCOUNTS } from './demo-accounts';
import { isStrongPassword } from './password';
import { ManagedUser, SessionUser, UserRole } from '../../shared/models/user.model';

const STORAGE_KEY = 'dativa.users';

export interface StoredUser extends ManagedUser {
  password: string;
}

export class AuthError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export function listStoredUsers(): StoredUser[] {
  return readUsers();
}

export function listManagedUsers(): ManagedUser[] {
  return readUsers().map(toManaged);
}

export function authenticateMock(email: string, password: string): SessionUser {
  const user = findByEmail(email);
  if (!user || user.password !== password) {
    throw new AuthError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
  }
  if (!user.active) {
    throw new AuthError('INACTIVE', 'Esta cuenta está desactivada.');
  }

  user.lastLoginAt = new Date().toISOString();
  writeUsers(upsert(user));
  return toSession(user);
}

export function registerMock(input: {
  name: string;
  email: string;
  password: string;
}): SessionUser {
  const email = normalizeEmail(input.email);
  if (findByEmail(email)) {
    throw new AuthError('EMAIL_TAKEN', 'Ya existe una cuenta con este correo.');
  }
  requirePassword(input.password);

  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name: input.name.trim(),
    role: 'VIEWER',
    active: true,
    password: input.password,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  writeUsers([...readUsers(), user]);
  return toSession(user);
}

export function createManagedUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): ManagedUser {
  const email = normalizeEmail(input.email);
  if (findByEmail(email)) {
    throw new AuthError('EMAIL_TAKEN', 'Ya existe una cuenta con este correo.');
  }
  requirePassword(input.password);

  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name: input.name.trim(),
    role: input.role,
    active: true,
    password: input.password,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  writeUsers([...readUsers(), user]);
  return toManaged(user);
}

export function updateManagedUser(
  id: string,
  patch: Partial<Pick<StoredUser, 'name' | 'email' | 'role' | 'active' | 'password'>>,
): ManagedUser {
  const users = readUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new AuthError('NOT_FOUND', 'No se encontró el usuario.');
  }

  const current = users[index];
  const next: StoredUser = { ...current };

  if (patch.name !== undefined) {
    next.name = patch.name.trim();
  }
  if (patch.email !== undefined) {
    const email = normalizeEmail(patch.email);
    const taken = users.find((item) => item.id !== id && item.email === email);
    if (taken) {
      throw new AuthError('EMAIL_TAKEN', 'Ya existe una cuenta con este correo.');
    }
    next.email = email;
  }
  if (patch.role !== undefined) {
    assertRoleChange(users, current, patch.role);
    next.role = patch.role;
  }
  if (patch.active !== undefined) {
    assertActiveChange(users, current, patch.active);
    next.active = patch.active;
  }
  if (patch.password !== undefined) {
    requirePassword(patch.password);
    next.password = patch.password;
  }

  users[index] = next;
  writeUsers(users);
  return toManaged(next);
}

export function updateMockProfile(
  userId: string,
  patch: { name?: string; email?: string },
): SessionUser {
  const updated = updateManagedUser(userId, patch);
  const stored = findById(userId);
  if (!stored) {
    throw new AuthError('NOT_FOUND', 'No se encontró el usuario.');
  }
  return toSession(stored);
}

export function changeMockPassword(userId: string, current: string, next: string): void {
  const user = findById(userId);
  if (!user || user.password !== current) {
    throw new AuthError('INVALID_PASSWORD', 'La contraseña actual no es correcta.');
  }
  updateManagedUser(userId, { password: next });
}

export function mockSessionFor(user: SessionUser): { accessToken: string; user: SessionUser } {
  return {
    accessToken: `mock.${user.id}`,
    user,
  };
}

function assertRoleChange(users: StoredUser[], current: StoredUser, nextRole: UserRole): void {
  if (current.role === 'ADMIN' && nextRole !== 'ADMIN' && adminCount(users) <= 1) {
    throw new AuthError('LAST_ADMIN', 'Debe quedar al menos un administrador activo.');
  }
}

function assertActiveChange(users: StoredUser[], current: StoredUser, active: boolean): void {
  if (current.role === 'ADMIN' && current.active && !active && adminCount(users) <= 1) {
    throw new AuthError('LAST_ADMIN', 'No se puede desactivar al último administrador.');
  }
}

function adminCount(users: StoredUser[]): number {
  return users.filter((item) => item.role === 'ADMIN' && item.active).length;
}

function requirePassword(password: string): void {
  if (!isStrongPassword(password)) {
    throw new AuthError(
      'WEAK_PASSWORD',
      'La contraseña debe tener al menos 8 caracteres, una letra y un número.',
    );
  }
}

function seedUsers(): StoredUser[] {
  const now = new Date().toISOString();
  return DEMO_ACCOUNTS.map((account) => ({
    id: account.user.id,
    email: account.email.toLowerCase(),
    name: account.user.name,
    role: account.user.role,
    active: true,
    password: account.password,
    createdAt: now,
    lastLoginAt: null,
  }));
}

function readUsers(): StoredUser[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedUsers();
    writeUsers(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = seedUsers();
      writeUsers(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = seedUsers();
    writeUsers(seeded);
    return seeded;
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function findByEmail(email: string): StoredUser | undefined {
  const needle = normalizeEmail(email);
  return readUsers().find((item) => item.email === needle);
}

function findById(id: string): StoredUser | undefined {
  return readUsers().find((item) => item.id === id);
}

function upsert(user: StoredUser): StoredUser[] {
  return readUsers().map((item) => (item.id === user.id ? user : item));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toManaged(user: StoredUser): ManagedUser {
  const { password: _password, ...rest } = user;
  return rest;
}

function toSession(user: StoredUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
