import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Badge, BadgeTone, Card, EmptyState, Loading, Select } from '@dativa/ui';
import {
  ActivityAction,
  ActivityEvent,
  ActivityLog,
  ActivityResource,
} from '../../../../core/activity/activity.log';
import { PageHeader } from '../../../../layout/page-header/page-header';

const ACTION_LABELS: Record<ActivityAction, string> = {
  'user.created': 'Usuario creado',
  'user.enabled': 'Usuario activado',
  'user.disabled': 'Usuario desactivado',
  'user.updated': 'Usuario actualizado',
  'user.role_changed': 'Rol modificado',
  'dashboard.created': 'Dashboard creado',
  'dashboard.updated': 'Dashboard modificado',
  'dashboard.deleted': 'Dashboard eliminado',
  'widget.created': 'Widget creado',
  'widget.updated': 'Widget modificado',
  'widget.deleted': 'Widget eliminado',
  'import.completed': 'Importación',
  'alert.created': 'Alerta creada',
  'alert.updated': 'Alerta modificada',
  'alert.deleted': 'Alerta eliminada',
};

const RESOURCE_LABELS: Record<ActivityResource, string> = {
  user: 'Usuario',
  dashboard: 'Dashboard',
  widget: 'Widget',
  import: 'Importación',
  alert: 'Alerta',
};

const RESOURCE_TONES: Record<ActivityResource, BadgeTone> = {
  user: 'info',
  dashboard: 'neutral',
  widget: 'info',
  import: 'success',
  alert: 'warning',
};

@Component({
  selector: 'dtv-admin-activity-page',
  imports: [PageHeader, Card, EmptyState, Loading, Select, DatePipe, Badge],
  templateUrl: './admin-activity-page.html',
  styleUrl: './admin-activity-page.scss',
})
export class AdminActivityPage {
  private readonly activity = inject(ActivityLog);

  protected readonly status = signal<'loading' | 'ready'>('loading');
  protected readonly events = signal<ActivityEvent[]>([]);
  protected readonly actionFilter = signal('');
  protected readonly typeFilter = signal('');

  constructor() {
    this.reload();
  }

  protected actionLabel(action: ActivityAction): string {
    return ACTION_LABELS[action] ?? action;
  }

  protected resourceLabel(type: ActivityResource): string {
    return RESOURCE_LABELS[type] ?? type;
  }

  protected resourceTone(type: ActivityResource): BadgeTone {
    return RESOURCE_TONES[type] ?? 'neutral';
  }

  protected reload(): void {
    this.status.set('loading');
    void this.activity
      .list({ action: this.actionFilter(), resourceType: this.typeFilter() })
      .then((events) => {
        this.events.set(events);
        this.status.set('ready');
      })
      .catch(() => {
        this.events.set([]);
        this.status.set('ready');
      });
  }

  protected onAction(value: string): void {
    this.actionFilter.set(value);
    this.reload();
  }

  protected onType(value: string): void {
    this.typeFilter.set(value);
    this.reload();
  }
}
