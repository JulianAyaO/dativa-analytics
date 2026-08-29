import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthSession,
  LoginCredentials,
  RegisterRequest,
  SessionUser,
} from '../../shared/models/user.model';
import {
  AuthError,
  authenticateMock,
  mockSessionFor,
  registerMock,
} from './mock-users';

export { DEMO_ACCOUNTS, DEMO_ROLE_LABELS, type DemoAccount } from './demo-accounts';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    if (environment.useMockAuth) {
      return this.loginWithMock(credentials);
    }

    return firstValueFrom(
      this.http.post<unknown>(`${environment.apiUrl}/auth/login`, credentials),
    ).then(mapAuthSession);
  }

  async register(request: RegisterRequest): Promise<AuthSession> {
    if (environment.useMockAuth) {
      await delay(280);
      if (request.password !== request.passwordConfirm) {
        throw new AuthError('PASSWORD_MISMATCH', 'Las contraseñas no coinciden.');
      }
      const user = registerMock(request);
      return mockSessionFor(user);
    }

    return firstValueFrom(
      this.http.post<unknown>(`${environment.apiUrl}/auth/register`, request),
    ).then(mapAuthSession);
  }

  async me(): Promise<SessionUser> {
    if (environment.useMockAuth) {
      throw new Error('NOT_AVAILABLE');
    }

    return firstValueFrom(this.http.get<unknown>(`${environment.apiUrl}/auth/me`)).then(mapSessionUser);
  }

  private async loginWithMock(credentials: LoginCredentials): Promise<AuthSession> {
    await delay(350);
    const user = authenticateMock(credentials.email, credentials.password);
    return mockSessionFor(user);
  }
}

function mapAuthSession(raw: unknown): AuthSession {
  if (!isRecord(raw) || typeof raw['accessToken'] !== 'string') {
    throw new Error('INVALID_SESSION');
  }

  return {
    accessToken: raw['accessToken'],
    user: mapSessionUser(raw['user']),
  };
}

function mapSessionUser(raw: unknown): SessionUser {
  if (!isRecord(raw) || typeof raw['email'] !== 'string' || typeof raw['name'] !== 'string') {
    throw new Error('INVALID_SESSION');
  }

  const role = raw['role'];
  if (role !== 'ADMIN' && role !== 'ANALYST' && role !== 'VIEWER') {
    throw new Error('INVALID_SESSION');
  }

  return {
    id: String(raw['id'] ?? ''),
    email: raw['email'],
    name: raw['name'],
    role,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
