import { environment } from '../../../environments/environment';
import type { ActivityEvent } from '../../core/activity/activity.log';
import { AnalyticsAlert } from '../../features/alerts/alert.models';
import { Dashboard } from '../../features/dashboards/models/dashboard.models';
import { emptyFilters } from '../../features/dashboards/filters/dashboard-filters';
import { WidgetConfig, WidgetInstance, WidgetLayout, WidgetType } from '../../features/dashboards/widgets/widget.models';
import { defaultConfig } from '../../features/dashboards/widgets/widget.factory';
import type { AppNotification } from '../../features/notifications/notification.store';

export const PORTFOLIO_DEMO_VERSION = 'video-2026-08';
const SEED_KEY = 'dativa.demo.seed';

export function ensurePortfolioDemo(): void {
  if (!environment.useMockAuth || typeof localStorage === 'undefined') {
    return;
  }
  if (localStorage.getItem(SEED_KEY) === PORTFOLIO_DEMO_VERSION) {
    return;
  }

  seedDashboards();
  seedAlerts();
  seedNotifications();
  seedActivity();
  localStorage.setItem(SEED_KEY, PORTFOLIO_DEMO_VERSION);
}

function widget(
  id: string,
  type: WidgetType,
  title: string,
  layout: WidgetLayout,
  config: Partial<WidgetConfig> = {},
): WidgetInstance {
  return {
    id,
    type,
    title,
    layout,
    config: { ...defaultConfig(type), ...config },
  };
}

function board(
  id: string,
  name: string,
  description: string,
  widgets: WidgetInstance[],
  extras: Partial<Dashboard> = {},
): Dashboard {
  return {
    id,
    name,
    description,
    widgets,
    filters: extras.filters ?? emptyFilters(),
    filterPresets: extras.filterPresets ?? [],
    featured: extras.featured ?? false,
    isDefault: extras.isDefault ?? false,
    openCount: extras.openCount ?? 0,
    updatedAt: extras.updatedAt ?? '2026-08-28T18:00:00.000Z',
  };
}

function demoDashboards(): Dashboard[] {
  return [
    board(
      'demo-ingresos-2026',
      'Ingresos 2026',
      'Vista ejecutiva de ventas: KPIs, tendencia, mix de categorías y ranking comercial.',
      [
        widget('w-ing-kpi-rev', 'kpi', 'Ingresos del año', { x: 0, y: 0, cols: 3, rows: 2 }, {
          metric: 'revenue',
          period: 'last_12_months',
        }),
        widget('w-ing-kpi-units', 'kpi', 'Unidades vendidas', { x: 3, y: 0, cols: 3, rows: 2 }, {
          metric: 'units',
          period: 'last_12_months',
        }),
        widget('w-ing-kpi-orders', 'kpi', 'Pedidos cerrados', { x: 6, y: 0, cols: 3, rows: 2 }, {
          metric: 'orders',
          period: 'last_12_months',
        }),
        widget('w-ing-goal', 'progress', 'Avance vs meta anual', { x: 9, y: 0, cols: 3, rows: 2 }, {
          metric: 'revenue',
          period: 'last_12_months',
        }),
        widget('w-ing-line', 'line', 'Tendencia mensual', { x: 0, y: 2, cols: 8, rows: 4 }, {
          dimension: 'month',
          period: 'last_12_months',
        }),
        widget('w-ing-pie', 'pie', 'Mix por categoría', { x: 8, y: 2, cols: 4, rows: 4 }, {
          dimension: 'category',
          period: 'last_12_months',
        }),
        widget('w-ing-bar', 'bar', 'Ingresos por región', { x: 0, y: 6, cols: 7, rows: 4 }, {
          dimension: 'region',
          period: 'last_12_months',
        }),
        widget('w-ing-rank', 'ranking', 'Top vendedores', { x: 7, y: 6, cols: 5, rows: 5 }, {
          dimension: 'seller',
          topN: 5,
          period: 'last_12_months',
        }),
        widget('w-ing-table', 'table', 'Desglose de productos', { x: 0, y: 11, cols: 12, rows: 4 }, {
          dimension: 'product',
          period: 'last_12_months',
        }),
      ],
      {
        featured: true,
        isDefault: true,
        openCount: 186,
        updatedAt: '2026-08-29T09:40:00.000Z',
        filterPresets: [
          {
            id: 'preset-caribe',
            name: 'Caribe · 30 días',
            filters: { ...emptyFilters(), period: 'last_30_days', region: 'Caribe' },
          },
          {
            id: 'preset-electronica',
            name: 'Electrónica',
            filters: { ...emptyFilters(), category: 'Electrónica' },
          },
          {
            id: 'preset-ana',
            name: 'Cartera Ana Pérez',
            filters: { ...emptyFilters(), seller: 'Ana Pérez' },
          },
        ],
      },
    ),
    board(
      'demo-operacion-caribe',
      'Operación Caribe',
      'Seguimiento regional: categorías, productos estrella y ritmo de las últimas semanas.',
      [
        widget('w-car-kpi', 'kpi', 'Ingresos Caribe', { x: 0, y: 0, cols: 4, rows: 2 }, {
          period: 'last_30_days',
        }),
        widget('w-car-units', 'kpi', 'Unidades 30 días', { x: 4, y: 0, cols: 4, rows: 2 }, {
          metric: 'units',
          period: 'last_30_days',
        }),
        widget('w-car-ticket', 'kpi', 'Ticket promedio', { x: 8, y: 0, cols: 4, rows: 2 }, {
          metric: 'avg_ticket',
          period: 'last_30_days',
        }),
        widget('w-car-area', 'area', 'Evolución reciente', { x: 0, y: 2, cols: 8, rows: 4 }, {
          dimension: 'month',
          period: 'last_30_days',
        }),
        widget('w-car-rank-prod', 'ranking', 'Productos que tiran', { x: 8, y: 2, cols: 4, rows: 4 }, {
          dimension: 'product',
          topN: 5,
          period: 'last_30_days',
        }),
        widget('w-car-bar-cat', 'bar', 'Categorías en la costa', { x: 0, y: 6, cols: 7, rows: 4 }, {
          dimension: 'category',
          period: 'last_30_days',
        }),
        widget('w-car-table', 'table', 'Vendedores en Caribe', { x: 7, y: 6, cols: 5, rows: 4 }, {
          dimension: 'seller',
          period: 'last_30_days',
        }),
      ],
      {
        featured: true,
        openCount: 74,
        updatedAt: '2026-08-28T16:20:00.000Z',
        filters: { ...emptyFilters(), region: 'Caribe' },
        filterPresets: [
          {
            id: 'preset-andina',
            name: 'Comparar Andina',
            filters: { ...emptyFilters(), region: 'Andina', period: 'last_30_days' },
          },
        ],
      },
    ),
    board(
      'demo-pedidos',
      'Pedidos y cumplimiento',
      'Embudo de pedidos (no uses 7 días: el mock no tiene volumen). Metas, regiones y categorías.',
      [
        widget('w-ped-kpi', 'kpi', 'Importe en pedidos', { x: 0, y: 0, cols: 4, rows: 2 }, {
          dataset: 'orders',
          metric: 'revenue',
          period: 'last_12_months',
        }),
        widget('w-ped-count', 'kpi', 'Órdenes del año', { x: 4, y: 0, cols: 4, rows: 2 }, {
          dataset: 'orders',
          metric: 'orders',
          period: 'last_12_months',
        }),
        widget('w-ped-goal', 'progress', 'Cumplimiento de cuota', { x: 8, y: 0, cols: 4, rows: 2 }, {
          dataset: 'orders',
          metric: 'revenue',
          period: 'last_12_months',
        }),
        widget('w-ped-line', 'line', 'Pedidos mes a mes', { x: 0, y: 2, cols: 8, rows: 4 }, {
          dataset: 'orders',
          dimension: 'month',
          period: 'last_12_months',
        }),
        widget('w-ped-pie', 'pie', 'Pedidos por categoría', { x: 8, y: 2, cols: 4, rows: 4 }, {
          dataset: 'orders',
          dimension: 'category',
          period: 'last_12_months',
        }),
        widget('w-ped-bar', 'bar', 'Pedidos por región', { x: 0, y: 6, cols: 12, rows: 4 }, {
          dataset: 'orders',
          dimension: 'region',
          period: 'last_12_months',
        }),
      ],
      {
        openCount: 41,
        updatedAt: '2026-08-27T11:05:00.000Z',
      },
    ),
    board(
      'demo-equipo',
      'Equipo comercial',
      'Quién vende, qué productos empujan y cómo se reparte la cartera.',
      [
        widget('w-eq-kpi', 'kpi', 'Ingresos del equipo', { x: 0, y: 0, cols: 3, rows: 2 }),
        widget('w-eq-rank', 'ranking', 'Ranking de vendedores', { x: 3, y: 0, cols: 5, rows: 5 }, {
          dimension: 'seller',
          topN: 5,
        }),
        widget('w-eq-bar', 'bar', 'Cartera por vendedor', { x: 8, y: 0, cols: 4, rows: 5 }, {
          dimension: 'seller',
        }),
        widget('w-eq-table', 'table', 'Categorías por vendedor', { x: 0, y: 5, cols: 6, rows: 4 }, {
          dimension: 'category',
        }),
        widget('w-eq-prod', 'ranking', 'Top productos', { x: 6, y: 5, cols: 6, rows: 4 }, {
          dimension: 'product',
          topN: 10,
        }),
      ],
      {
        openCount: 29,
        updatedAt: '2026-08-26T19:15:00.000Z',
      },
    ),
  ];
}

function seedDashboards(): void {
  const existing = readJson<Dashboard[]>('dativa.dashboards', []);
  const kept = existing.filter((item) => !item.id.startsWith('demo-'));
  const demos = demoDashboards();
  localStorage.setItem('dativa.dashboards', JSON.stringify([...demos, ...kept]));

  const order = readJson<string[]>('dativa.dashboards.order', []);
  const demoIds = demos.map((item) => item.id);
  localStorage.setItem(
    'dativa.dashboards.order',
    JSON.stringify([...demoIds, ...order.filter((id) => !id.startsWith('demo-'))]),
  );
}

function seedAlerts(): void {
  const existing = readJson<AnalyticsAlert[]>('dativa.alerts', []);
  const kept = existing.filter((item) => !item.id.startsWith('demo-alert-'));
  const now = '2026-08-29T08:12:00.000Z';
  const demos: AnalyticsAlert[] = [
    {
      id: 'demo-alert-caribe',
      name: 'Ingresos Caribe por encima de 40 M',
      dataset: 'sales',
      metric: 'revenue',
      period: 'last_30_days',
      region: 'Caribe',
      category: '',
      product: '',
      seller: '',
      condition: 'above',
      threshold: 40_000_000,
      frequencyMinutes: 60,
      active: true,
      dashboardId: 'demo-operacion-caribe',
      lastFiredAt: now,
      createdAt: '2026-08-10T14:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'demo-alert-meta',
      name: 'Meta anual de ingresos',
      dataset: 'sales',
      metric: 'revenue',
      period: 'last_12_months',
      region: '',
      category: '',
      product: '',
      seller: '',
      condition: 'goal',
      threshold: 900_000_000,
      frequencyMinutes: 1440,
      active: true,
      dashboardId: 'demo-ingresos-2026',
      lastFiredAt: null,
      createdAt: '2026-07-01T09:00:00.000Z',
      updatedAt: '2026-08-20T09:00:00.000Z',
    },
    {
      id: 'demo-alert-moda',
      name: 'Caída de unidades en Moda',
      dataset: 'sales',
      metric: 'units',
      period: 'last_7_days',
      region: '',
      category: 'Moda',
      product: '',
      seller: '',
      condition: 'below',
      threshold: 80,
      frequencyMinutes: 180,
      active: true,
      dashboardId: null,
      lastFiredAt: '2026-08-28T21:40:00.000Z',
      createdAt: '2026-08-15T10:00:00.000Z',
      updatedAt: '2026-08-28T21:40:00.000Z',
    },
  ];
  localStorage.setItem('dativa.alerts', JSON.stringify([...demos, ...kept]));
}

function seedNotifications(): void {
  const existing = readJson<AppNotification[]>('dativa.notifications', []);
  const kept = existing.filter((item) => !item.id.startsWith('demo-note-'));
  const demos: AppNotification[] = [
    {
      id: 'demo-note-alert',
      type: 'alert_fired',
      title: 'Alerta activada',
      body: 'Ingresos Caribe por encima de 40 M',
      createdAt: '2026-08-29T08:12:00.000Z',
      readAt: null,
    },
    {
      id: 'demo-note-import',
      type: 'import_done',
      title: 'Importación lista',
      body: 'Se cargaron 240 filas nuevas de Ventas (archivo feria-agosto.xlsx).',
      createdAt: '2026-08-28T17:05:00.000Z',
      readAt: null,
    },
    {
      id: 'demo-note-data',
      type: 'data',
      title: 'Cierre de jornada',
      body: 'El tablero Ingresos 2026 ya refleja las ventas de ayer.',
      createdAt: '2026-08-28T22:00:00.000Z',
      readAt: '2026-08-29T07:40:00.000Z',
    },
    {
      id: 'demo-note-user',
      type: 'user_enabled',
      title: 'Usuario activado',
      body: 'Se activó la cuenta de Marta Visualizadora.',
      createdAt: '2026-08-27T12:30:00.000Z',
      readAt: null,
    },
  ];
  localStorage.setItem('dativa.notifications', JSON.stringify([...demos, ...kept]));
}

function seedActivity(): void {
  const existing = readJson<ActivityEvent[]>('dativa.activity', []);
  const kept = existing.filter((item) => !item.id.startsWith('demo-act-'));
  const demos: ActivityEvent[] = [
    {
      id: 'demo-act-1',
      actorId: 'usr_analyst',
      actorName: 'Luis Analista',
      action: 'dashboard.updated',
      resourceType: 'dashboard',
      summary: 'Se modificó Ingresos 2026.',
      createdAt: '2026-08-29T09:40:00.000Z',
    },
    {
      id: 'demo-act-2',
      actorId: 'usr_analyst',
      actorName: 'Luis Analista',
      action: 'widget.created',
      resourceType: 'widget',
      summary: 'Se añadió Top vendedores en Ingresos 2026.',
      createdAt: '2026-08-29T09:38:00.000Z',
    },
    {
      id: 'demo-act-3',
      actorId: 'usr_admin',
      actorName: 'Ana Admin',
      action: 'import.completed',
      resourceType: 'import',
      summary: 'Se importaron 240 filas en Ventas.',
      createdAt: '2026-08-28T17:05:00.000Z',
    },
    {
      id: 'demo-act-4',
      actorId: 'usr_analyst',
      actorName: 'Luis Analista',
      action: 'alert.created',
      resourceType: 'alert',
      summary: 'Se creó Ingresos Caribe por encima de 40 M.',
      createdAt: '2026-08-10T14:00:00.000Z',
    },
    {
      id: 'demo-act-5',
      actorId: 'usr_admin',
      actorName: 'Ana Admin',
      action: 'user.enabled',
      resourceType: 'user',
      summary: 'Se activó Marta Visualizadora.',
      createdAt: '2026-08-27T12:30:00.000Z',
    },
    {
      id: 'demo-act-6',
      actorId: 'usr_analyst',
      actorName: 'Luis Analista',
      action: 'dashboard.created',
      resourceType: 'dashboard',
      summary: 'Se creó Operación Caribe.',
      createdAt: '2026-08-12T10:00:00.000Z',
    },
  ];
  localStorage.setItem('dativa.activity', JSON.stringify([...demos, ...kept]));
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
