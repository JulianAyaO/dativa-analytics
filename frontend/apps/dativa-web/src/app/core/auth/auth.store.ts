import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AuthSession,
  LoginCredentials,
  RegisterRequest,
  canEditDashboards,
  canImportData,
  canManageAlerts,
} from '../../shared/models/user.model';
import { AuthApi } from './auth.api';
import { AuthError } from './mock-users';

const SESSION_KEY = 'dativa.session';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);

  private readonly session = signal<AuthSession | null>(readSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.accessToken ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly role = computed(() => this.user()?.role ?? null);
  readonly canEdit = computed(() => {
    const role = this.role();
    return role ? canEditDashboards(role) : false;
  });
  readonly canImport = computed(() => {
    const role = this.role();
    return role ? canImportData(role) : false;
  });
  readonly canManageAlerts = computed(() => {
    const role = this.role();
    return role ? canManageAlerts(role) : false;
  });
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  async login(credentials: LoginCredentials): Promise<void> {
    const next = await this.api.login(credentials);
    this.persist(next);
  }

  async register(request: RegisterRequest): Promise<void> {
    const next = await this.api.register(request);
    this.persist(next);
  }

  applySession(session: AuthSession): void {
    this.persist(session);
  }

  logout(): void {
    this.persist(null);
  }

  private persist(session: AuthSession | null): void {
    this.session.set(session);

    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return;
    }

    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function readAuthError(error: unknown, fallback: string): string {
  if (error instanceof AuthError) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'error' in error) {
    const body = (error as { error?: { message?: unknown } }).error;
    if (typeof body?.message === 'string' && body.message) {
      return mapApiMessage(body.message);
    }
  }

  return fallback;
}

function mapApiMessage(message: string): string {
  const known: Record<string, string> = {
    'Invalid credentials': 'Correo o contraseña incorrectos.',
    'Email already registered': 'Ya existe una cuenta con este correo.',
    'Passwords do not match': 'Las contraseñas no coinciden.',
    'Current password is incorrect': 'La contraseña actual no es correcta.',
    'Cannot disable the last admin': 'No se puede desactivar al último administrador.',
  };
  return known[message] ?? message;
}

function readSession(): AuthSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}
