import { Client, IMessage } from '@stomp/stompjs';
import { parseNotificationPush } from '../../features/notifications/notification.store';
import { parseSaleCreated } from './sale-created';
import { RealtimeTransport, RealtimeTransportStart } from './realtime.transport';

export class StompRealtimeTransport implements RealtimeTransport {
  private client: Client | null = null;
  private generation = 0;
  private notifiedClose = false;

  start(options: RealtimeTransportStart): void {
    this.stop();
    const generation = ++this.generation;
    this.notifiedClose = false;

    const client = new Client({
      brokerURL: options.url,
      connectHeaders: { Authorization: `Bearer ${options.token}` },
      reconnectDelay: 0,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        if (generation !== this.generation) {
          return;
        }
        client.subscribe('/topic/sales', (message: IMessage) => {
          const sale = parseSaleCreated(readBody(message.body));
          if (sale) {
            options.handlers.onSale(sale);
          }
        });
        client.subscribe('/topic/notifications', (message: IMessage) => {
          const notification = parseNotificationPush(readBody(message.body));
          if (notification) {
            options.handlers.onNotification(notification);
          }
        });
        options.handlers.onConnected();
      },
      onWebSocketClose: () => this.notifyClosed(generation, options),
      onStompError: () => {
        void client.deactivate();
      },
    });

    this.client = client;
    client.activate();
  }

  stop(): void {
    this.generation += 1;
    const client = this.client;
    this.client = null;
    if (client?.active) {
      void client.deactivate();
    }
  }

  private notifyClosed(generation: number, options: RealtimeTransportStart): void {
    if (generation !== this.generation || this.notifiedClose) {
      return;
    }
    this.notifiedClose = true;
    options.handlers.onDisconnected();
  }
}

function readBody(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}
