import { ensurePortfolioDemo } from '../../core/demo/portfolio-demo';
import { UserRole } from '../../shared/models/user.model';

export type NotificationType =
  | 'alert_fired'
  | 'import_done'
  | 'import_failed'
  | 'user_disabled'
  | 'user_enabled'
  | 'data';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPush {
  id?: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  recipientRole?: string;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  alert_fired: 'Alerta',
  import_done: 'Importación',
  import_failed: 'Importación',
  user_disabled: 'Usuarios',
  user_enabled: 'Usuarios',
  data: 'Datos',
};

const TYPES = new Set<NotificationType>([
  'alert_fired',
  'import_done',
  'import_failed',
  'user_disabled',
  'user_enabled',
  'data',
]);

export function rolesForNotification(type: NotificationType): UserRole[] {
  switch (type) {
    case 'user_disabled':
    case 'user_enabled':
      return ['ADMIN'];
    case 'import_done':
    case 'import_failed':
      return ['ADMIN', 'ANALYST'];
    case 'alert_fired':
    case 'data':
      return ['ADMIN', 'ANALYST', 'VIEWER'];
  }
}

export function notificationVisibleTo(type: NotificationType, role: UserRole | null): boolean {
  return role !== null && rolesForNotification(type).includes(role);
}

export function parseNotificationPush(raw: unknown): NotificationPush | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const type = value['type'];
  const title = value['title'];
  const body = value['body'];
  if (typeof type !== 'string' || !TYPES.has(type as NotificationType) || typeof title !== 'string') {
    return null;
  }
  return {
    id: typeof value['id'] === 'string' ? value['id'] : undefined,
    type: type as NotificationType,
    title,
    body: typeof body === 'string' ? body : '',
    createdAt: typeof value['createdAt'] === 'string' ? value['createdAt'] : new Date().toISOString(),
    recipientRole: typeof value['recipientRole'] === 'string' ? value['recipientRole'] : undefined,
  };
}

const STORAGE_KEY = 'dativa.notifications';

export function readNotifications(): AppNotification[] {
  ensurePortfolioDemo();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeNotifications(items: AppNotification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
}

export function pushLocalNotification(input: {
  type: NotificationType;
  title: string;
  body: string;
}): AppNotification {
  const item: AppNotification = {
    id: crypto.randomUUID(),
    type: input.type,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  writeNotifications([item, ...readNotifications()]);
  return item;
}
