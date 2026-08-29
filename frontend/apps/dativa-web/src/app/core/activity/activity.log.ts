import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';

export type ActivityAction =
  | 'user.created'
  | 'user.disabled'
  | 'user.enabled'
  | 'user.updated'
  | 'user.role_changed'
  | 'dashboard.created'
  | 'dashboard.updated'
  | 'dashboard.deleted'
  | 'widget.created'
  | 'widget.updated'
  | 'widget.deleted'
  | 'import.completed'
  | 'alert.created'
  | 'alert.updated'
  | 'alert.deleted';

export type ActivityResource = 'user' | 'dashboard' | 'widget' | 'import' | 'alert';

export interface ActivityEvent {
  id: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  resourceType: ActivityResource;
  summary: string;
  createdAt: string;
}

const STORAGE_KEY = 'dativa.activity';
const MAX_EVENTS = 200;

@Injectable({ providedIn: 'root' })
export class ActivityLog {
  private readonly auth = inject(AuthStore);
  private readonly http = inject(HttpClient);

  record(action: ActivityAction, resourceType: ActivityResource, summary: string): void {
    if (!environment.useMockAuth) {
      return;
    }

    const user = this.auth.user();
    const event: ActivityEvent = {
      id: crypto.randomUUID(),
      actorId: user?.id ?? '',
      actorName: user?.name ?? 'Sistema',
      action,
      resourceType,
      summary,
      createdAt: new Date().toISOString(),
    };

    const next = [event, ...readEvents()].slice(0, MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async list(filters?: { action?: string; resourceType?: string }): Promise<ActivityEvent[]> {
    const action = filters?.action?.trim() ?? '';
    const resourceType = filters?.resourceType?.trim() ?? '';
    if (environment.useMockAuth) {
      return readEvents().filter((event) => {
        if (action && event.action !== action) {
          return false;
        }
        if (resourceType && event.resourceType !== resourceType) {
          return false;
        }
        return true;
      });
    }

    const params: Record<string, string> = { page: '0', size: '50' };
    if (action) {
      params['action'] = action;
    }
    if (resourceType) {
      params['resourceType'] = resourceType;
    }
    const page = await firstValueFrom(
      this.http.get<{ content: ActivityEvent[] }>(`${environment.apiUrl}/admin/activity`, { params }),
    );
    return page.content ?? [];
  }
}

function readEvents(): ActivityEvent[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ActivityEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
