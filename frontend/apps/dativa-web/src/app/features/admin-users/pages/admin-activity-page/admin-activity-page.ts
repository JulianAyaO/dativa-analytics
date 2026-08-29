import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Card, EmptyState, Loading, Select } from '@dativa/ui';
import { ActivityEvent, ActivityLog } from '../../../../core/activity/activity.log';
import { PageHeader } from '../../../../layout/page-header/page-header';

@Component({
  selector: 'dtv-admin-activity-page',
  imports: [PageHeader, Card, EmptyState, Loading, Select, DatePipe],
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
