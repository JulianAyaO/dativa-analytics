import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Badge, Button, Card, EmptyState, Input, Loading, Select } from '@dativa/ui';
import { AuthStore } from '../../../../core/auth/auth.store';
import { PageHeader } from '../../../../layout/page-header/page-header';
import { DATASET_OPTIONS, METRIC_OPTIONS, PERIOD_OPTIONS } from '../../../dashboards/widgets/widget.schema';
import { ALERT_CONDITION_LABELS, AnalyticsAlert, AlertCondition } from '../../alert.models';
import { AlertsApi } from '../../data/alerts.api';
import { AlertEvaluator } from '../../alert.evaluator';

@Component({
  selector: 'dtv-alerts-page',
  imports: [PageHeader, Card, Button, Badge, Input, Select, EmptyState, Loading, FormField, DatePipe],
  templateUrl: './alerts-page.html',
  styleUrl: './alerts-page.scss',
})
export class AlertsPage {
  private readonly api = inject(AlertsApi);
  private readonly evaluator = inject(AlertEvaluator);
  protected readonly auth = inject(AuthStore);
  protected readonly datasets = DATASET_OPTIONS;
  protected readonly metrics = METRIC_OPTIONS;
  protected readonly periods = PERIOD_OPTIONS;
  protected readonly conditions = Object.entries(ALERT_CONDITION_LABELS) as Array<
    [AlertCondition, string]
  >;

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly alerts = signal<AnalyticsAlert[]>([]);
  protected readonly editing = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly draft = signal({
    name: '',
    dataset: 'sales',
    metric: 'revenue',
    period: 'last_12_months',
    condition: 'above' as AlertCondition,
    threshold: '10000000',
    frequencyMinutes: '1',
    region: '',
    active: 'true',
  });
  protected readonly draftForm = form(this.draft, (fields) => {
    required(fields.name, { message: 'El nombre es obligatorio' });
    required(fields.threshold, { message: 'El valor es obligatorio' });
  });

  constructor() {
    void this.refresh();
    this.evaluator.start();
  }

  protected async refresh(): Promise<void> {
    this.status.set('loading');
    try {
      this.alerts.set(await this.api.list());
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  protected openCreate(): void {
    this.editing.set(true);
    this.editingId.set(null);
    this.draft.set({
      name: '',
      dataset: 'sales',
      metric: 'revenue',
      period: 'last_12_months',
      condition: 'above',
      threshold: '10000000',
      frequencyMinutes: '1',
      region: '',
      active: 'true',
    });
  }

  protected openEdit(alert: AnalyticsAlert): void {
    this.editing.set(true);
    this.editingId.set(alert.id);
    this.draft.set({
      name: alert.name,
      dataset: alert.dataset,
      metric: alert.metric,
      period: alert.period,
      condition: alert.condition,
      threshold: String(alert.threshold),
      frequencyMinutes: String(alert.frequencyMinutes),
      region: alert.region,
      active: alert.active ? 'true' : 'false',
    });
  }

  protected summaryText(): string {
    const value = this.draft();
    const metric = this.metrics.find((item) => item.value === value.metric)?.label ?? value.metric;
    const condition = ALERT_CONDITION_LABELS[value.condition];
    return `Se creará una alerta para ${metric} cuando ${condition.toLowerCase()} ${value.threshold}. ¿Deseas continuar?`;
  }

  protected async onSave(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.auth.canManageAlerts()) {
      return;
    }
    await submit(this.draftForm, async () => {
      if (!globalThis.confirm(this.summaryText())) {
        return;
      }
      const value = this.draft();
      const now = new Date().toISOString();
      const alert: AnalyticsAlert = {
        id: this.editingId() ?? crypto.randomUUID(),
        name: value.name.trim(),
        dataset: value.dataset === 'orders' ? 'orders' : 'sales',
        metric:
          value.metric === 'units' || value.metric === 'orders' || value.metric === 'avg_ticket'
            ? value.metric
            : 'revenue',
        period:
          value.period === 'last_7_days' || value.period === 'last_30_days'
            ? value.period
            : 'last_12_months',
        region: value.region.trim(),
        category: '',
        product: '',
        seller: '',
        condition: value.condition,
        threshold: Number(value.threshold),
        frequencyMinutes: Number(value.frequencyMinutes) || 1,
        active: value.active === 'true',
        dashboardId: null,
        lastFiredAt: this.alerts().find((item) => item.id === this.editingId())?.lastFiredAt ?? null,
        createdAt: this.alerts().find((item) => item.id === this.editingId())?.createdAt ?? now,
        updatedAt: now,
      };
      await this.api.save(alert, !this.editingId());
      this.editing.set(false);
      await this.evaluator.evaluateAll();
      await this.refresh();
    });
  }

  protected async toggle(alert: AnalyticsAlert): Promise<void> {
    await this.api.save({ ...alert, active: !alert.active }, false);
    await this.refresh();
  }

  protected async remove(alert: AnalyticsAlert): Promise<void> {
    if (!globalThis.confirm(`¿Eliminar la alerta “${alert.name}”?`)) {
      return;
    }
    await this.api.remove(alert.id);
    await this.refresh();
  }
}
