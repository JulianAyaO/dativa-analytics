import { Injectable, effect, inject, untracked } from '@angular/core';
import { RealtimeClient } from '../../core/realtime/realtime.client';
import { WidgetQueryService } from '../dashboards/widgets/query/widget-query.service';
import { emptyFilters } from '../dashboards/filters/dashboard-filters';
import { alertConditionMatches, alertRecentlyFired } from './alert-condition';
import { AnalyticsAlert } from './alert.models';
import { AlertsApi } from './data/alerts.api';

@Injectable({ providedIn: 'root' })
export class AlertEvaluator {
  private readonly api = inject(AlertsApi);
  private readonly queries = inject(WidgetQueryService);
  private readonly realtime = inject(RealtimeClient);
  private timer: ReturnType<typeof globalThis.setInterval> | null = null;
  private running = false;

  constructor() {
    effect(() => {
      const event = this.realtime.event();
      if (!event) {
        return;
      }
      untracked(() => void this.evaluateAll());
    });
  }

  start(): void {
    if (this.timer) {
      return;
    }
    void this.evaluateAll();
    this.timer = globalThis.setInterval(() => void this.evaluateAll(), 60_000);
  }

  stop(): void {
    if (this.timer) {
      globalThis.clearInterval(this.timer);
      this.timer = null;
    }
  }

  async evaluateAll(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const alerts = (await this.api.list()).filter((item) => item.active);
      for (const alert of alerts) {
        await this.evaluate(alert);
      }
    } finally {
      this.running = false;
    }
  }

  private async evaluate(alert: AnalyticsAlert): Promise<void> {
    const result = await this.queries.execute({
      type: 'kpi',
      config: {
        dataset: alert.dataset,
        metric: alert.metric,
        period: alert.period,
      },
      filters: {
        ...emptyFilters(),
        region: alert.region,
        category: alert.category,
        product: alert.product,
        seller: alert.seller,
      },
    });
    if (result.status !== 'ready' || result.data.family !== 'kpi') {
      return;
    }
    if (
      alertConditionMatches(alert.condition, alert.threshold, result.data.value, result.data.changePct) &&
      !alertRecentlyFired(alert.lastFiredAt, alert.frequencyMinutes)
    ) {
      this.api.markFired(alert.id);
    }
  }
}
