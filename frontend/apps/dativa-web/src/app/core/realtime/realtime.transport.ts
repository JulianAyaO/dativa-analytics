import { SaleCreated } from './sale-created';
import { NotificationPush } from '../../features/notifications/notification.store';

export interface RealtimeTransportHandlers {
  onConnected: () => void;
  onDisconnected: () => void;
  onSale: (sale: SaleCreated) => void;
  onNotification: (notification: NotificationPush) => void;
}

export interface RealtimeTransportStart {
  url: string;
  token: string;
  handlers: RealtimeTransportHandlers;
}

export interface RealtimeTransport {
  start(options: RealtimeTransportStart): void;
  stop(): void;
}
