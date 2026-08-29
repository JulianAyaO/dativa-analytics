import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession, ManagedUser, UserRole } from '../../shared/models/user.model';
import { AuthError } from './mock-users';
import { ActivityLog } from '../activity/activity.log';
import { NotificationsApi } from '../../features/notifications/notifications.api';
import {
  changeMockPassword,
  createManagedUser,
  listManagedUsers,
  mockSessionFor,
  updateManagedUser,
  updateMockProfile,
} from './mock-users';

export interface UserQuery {
  search: string;
  role: UserRole | '';
  status: 'all' | 'active' | 'inactive';
}

export interface CreateUserDraft {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDraft {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly activity = inject(ActivityLog);
  private readonly notifications = inject(NotificationsApi);

  async list(query: UserQuery): Promise<ManagedUser[]> {
    const users = environment.useMockAuth
      ? listManagedUsers()
      : await firstValueFrom(this.http.get<ManagedUser[]>(`${environment.apiUrl}/admin/users`));

    return users
      .filter((user) => matchesQuery(user, query))
      .sort((left, right) => left.name.localeCompare(right.name, 'es'));
  }

  async create(draft: CreateUserDraft): Promise<ManagedUser> {
    if (environment.useMockAuth) {
      await delay(220);
      const user = createManagedUser(draft);
      this.activity.record('user.created', 'user', `Se creó ${user.name} (${user.role}).`);
      return user;
    }

    return firstValueFrom(this.http.post<ManagedUser>(`${environment.apiUrl}/admin/users`, draft));
  }

  async update(id: string, draft: UpdateUserDraft): Promise<ManagedUser> {
    if (environment.useMockAuth) {
      await delay(180);
      const before = listManagedUsers().find((item) => item.id === id);
      const user = updateManagedUser(id, draft);
      if (before && before.role !== user.role) {
        this.activity.record(
          'user.role_changed',
          'user',
          `Rol de ${user.name}: ${before.role} → ${user.role}.`,
        );
      }
      if (before && (before.name !== user.name || before.email !== user.email)) {
        this.activity.record('user.updated', 'user', `Se actualizó ${user.name}.`);
      }
      if (before?.active && !user.active) {
        this.activity.record('user.disabled', 'user', `Se desactivó ${user.name}.`);
        this.notifications.push('user_disabled', 'Usuario desactivado', `Se desactivó ${user.name}.`);
      }
      if (before && !before.active && user.active) {
        this.activity.record('user.enabled', 'user', `Se activó ${user.name}.`);
        this.notifications.push('user_enabled', 'Usuario activado', `Se activó ${user.name}.`);
      }
      return user;
    }

    return firstValueFrom(
      this.http.patch<ManagedUser>(`${environment.apiUrl}/admin/users/${id}`, draft),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly http = inject(HttpClient);

  async updateProfile(
    userId: string,
    input: { name: string; email: string; emailConfirm: string },
  ): Promise<AuthSession> {
    if (input.email.trim().toLowerCase() !== input.emailConfirm.trim().toLowerCase()) {
      throw new AuthError('EMAIL_MISMATCH', 'Los correos no coinciden.');
    }

    if (environment.useMockAuth) {
      await delay(200);
      return mockSessionFor(updateMockProfile(userId, { name: input.name, email: input.email }));
    }

    return firstValueFrom(
      this.http.patch<AuthSession>(`${environment.apiUrl}/account/profile`, {
        name: input.name,
        email: input.email,
        emailConfirm: input.emailConfirm,
      }),
    );
  }

  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string; newPasswordConfirm: string },
  ): Promise<void> {
    if (input.newPassword !== input.newPasswordConfirm) {
      throw new AuthError('PASSWORD_MISMATCH', 'Las contraseñas no coinciden.');
    }

    if (environment.useMockAuth) {
      await delay(200);
      changeMockPassword(userId, input.currentPassword, input.newPassword);
      return;
    }

    await firstValueFrom(this.http.post(`${environment.apiUrl}/account/password`, input));
  }
}

function matchesQuery(user: ManagedUser, query: UserQuery): boolean {
  if (query.role && user.role !== query.role) {
    return false;
  }
  if (query.status === 'active' && !user.active) {
    return false;
  }
  if (query.status === 'inactive' && user.active) {
    return false;
  }

  const needle = query.search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
