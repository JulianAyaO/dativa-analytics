import { notificationVisibleTo, parseNotificationPush } from './notification.store';

describe('notification payload', () => {
  it('parses a STOMP notification and rejects unknown types', () => {
    const parsed = parseNotificationPush({
      type: 'alert_fired',
      title: 'Alerta activada',
      body: 'Ingresos altos',
      createdAt: '2026-08-24T12:00:00.000Z',
    });
    expect(parsed?.title).toBe('Alerta activada');
    expect(parseNotificationPush({ type: 'email', title: 'Hola' })).toBeNull();
  });

  it('limits user and import avisos to the roles that need them', () => {
    expect(notificationVisibleTo('user_disabled', 'ADMIN')).toBe(true);
    expect(notificationVisibleTo('user_enabled', 'ANALYST')).toBe(false);
    expect(notificationVisibleTo('user_disabled', 'VIEWER')).toBe(false);
    expect(notificationVisibleTo('import_done', 'ANALYST')).toBe(true);
    expect(notificationVisibleTo('import_failed', 'VIEWER')).toBe(false);
    expect(notificationVisibleTo('alert_fired', 'VIEWER')).toBe(true);
  });
});
