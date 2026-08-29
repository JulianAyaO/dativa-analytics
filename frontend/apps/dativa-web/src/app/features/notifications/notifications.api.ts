import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth/auth.store';
import {
  AppNotification,
  NotificationPush,
  notificationVisibleTo,
  parseNotificationPush,
  pushLocalNotification,
  readNotifications,
  writeNotifications,
} from './notification.store';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly items = signal<AppNotification[]>(this.visibleFromStore());

  readonly list = this.items.asReadonly();
  readonly unreadCount = computed(() => this.items().filter((item) => !item.readAt).length);

  refreshFromStore(): void {
    if (environment.useMockAuth) {
      this.items.set(this.visibleFromStore());
    }
  }

  async load(): Promise<void> {
    if (environment.useMockAuth) {
      this.items.set(this.visibleFromStore());
      return;
    }
    const all = await firstValueFrom(this.http.get<AppNotification[]>(`${environment.apiUrl}/notifications`));
    this.items.set(this.visibleOf(all));
  }

  async markRead(id: string): Promise<void> {
    if (environment.useMockAuth) {
      writeNotifications(
        readNotifications().map((item) =>
          item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
        ),
      );
      this.refreshFromStore();
      return;
    }
    await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/${id}/read`, {}));
    await this.load();
  }

  async markAllRead(): Promise<void> {
    if (environment.useMockAuth) {
      const now = new Date().toISOString();
      const role = this.auth.role();
      writeNotifications(
        readNotifications().map((item) =>
          notificationVisibleTo(item.type, role) ? { ...item, readAt: item.readAt ?? now } : item,
        ),
      );
      this.refreshFromStore();
      return;
    }
    await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/read-all`, {}));
    await this.load();
  }

  push(type: AppNotification['type'], title: string, body: string): void {
    if (!environment.useMockAuth) {
      return;
    }
    pushLocalNotification({ type, title, body });
    this.refreshFromStore();
  }

  ingest(raw: NotificationPush | unknown): void {
    const parsed = isPush(raw) ? raw : parseNotificationPush(raw);
    if (!parsed) {
      return;
    }
    const item: AppNotification = {
      id: parsed.id ?? crypto.randomUUID(),
      type: parsed.type,
      title: parsed.title,
      body: parsed.body,
      createdAt: parsed.createdAt,
      readAt: null,
    };
    if (environment.useMockAuth) {
      const existing = readNotifications();
      writeNotifications([item, ...existing.filter((entry) => entry.id !== item.id)]);
      this.refreshFromStore();
      return;
    }
    this.items.update((current) => this.visibleOf([item, ...current.filter((entry) => entry.id !== item.id)]).slice(0, 100));
  }

  private visibleFromStore(): AppNotification[] {
    return this.visibleOf(environment.useMockAuth ? readNotifications() : []);
  }

  private visibleOf(items: AppNotification[]): AppNotification[] {
    const role = this.auth.role();
    return items.filter((item) => notificationVisibleTo(item.type, role));
  }
}

function isPush(value: unknown): value is NotificationPush {
  return Boolean(value && typeof value === 'object' && 'type' in value && 'title' in value && 'createdAt' in value);
}
