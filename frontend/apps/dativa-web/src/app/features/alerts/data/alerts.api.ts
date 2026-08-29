import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActivityLog } from '../../../core/activity/activity.log';
import { AnalyticsAlert } from '../alert.models';
import { NotificationsApi } from '../../notifications/notifications.api';

const STORAGE_KEY = 'dativa.alerts';

@Injectable({ providedIn: 'root' })
export class AlertsApi {
  private readonly http = inject(HttpClient);
  private readonly activity = inject(ActivityLog);
  private readonly notifications = inject(NotificationsApi);

  async list(): Promise<AnalyticsAlert[]> {
    if (environment.useMockAuth) {
      return readAlerts();
    }
    return firstValueFrom(this.http.get<AnalyticsAlert[]>(`${environment.apiUrl}/alerts`));
  }

  async save(alert: AnalyticsAlert, isNew: boolean): Promise<AnalyticsAlert> {
    if (environment.useMockAuth) {
      const all = readAlerts();
      const index = all.findIndex((item) => item.id === alert.id);
      const next = { ...alert, updatedAt: new Date().toISOString() };
      if (index === -1) {
        all.unshift(next);
      } else {
        all[index] = next;
      }
      writeAlerts(all);
      this.activity.record(
        isNew ? 'alert.created' : 'alert.updated',
        'alert',
        `${isNew ? 'Se creó' : 'Se modificó'} ${next.name}.`,
      );
      return next;
    }
    if (isNew) {
      return firstValueFrom(this.http.post<AnalyticsAlert>(`${environment.apiUrl}/alerts`, alert));
    }
    return firstValueFrom(
      this.http.put<AnalyticsAlert>(`${environment.apiUrl}/alerts/${alert.id}`, alert),
    );
  }

  async remove(id: string): Promise<void> {
    if (environment.useMockAuth) {
      const current = readAlerts().find((item) => item.id === id);
      writeAlerts(readAlerts().filter((item) => item.id !== id));
      if (current) {
        this.activity.record('alert.deleted', 'alert', `Se eliminó ${current.name}.`);
      }
      return;
    }
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/alerts/${id}`));
  }

  markFired(id: string): void {
    if (!environment.useMockAuth) {
      return;
    }
    const all = readAlerts();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    all[index] = { ...all[index], lastFiredAt: new Date().toISOString() };
    writeAlerts(all);
    this.notifications.push('alert_fired', 'Alerta activada', all[index].name);
  }
}

function readAlerts(): AnalyticsAlert[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as AnalyticsAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAlerts(alerts: AnalyticsAlert[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}
