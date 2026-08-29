export type AlertCondition = 'above' | 'below' | 'change_pct' | 'goal';

export interface AnalyticsAlert {
  id: string;
  name: string;
  dataset: 'sales' | 'orders';
  metric: 'revenue' | 'units' | 'orders' | 'avg_ticket';
  period: 'last_7_days' | 'last_30_days' | 'last_12_months';
  region: string;
  category: string;
  product: string;
  seller: string;
  condition: AlertCondition;
  threshold: number;
  frequencyMinutes: number;
  active: boolean;
  dashboardId: string | null;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ALERT_CONDITION_LABELS: Record<AlertCondition, string> = {
  above: 'Supera un valor',
  below: 'Baja de un valor',
  change_pct: 'Varía respecto al periodo anterior (%)',
  goal: 'Alcanza una meta',
};
