import { InjectionToken, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';
import { NotificationsApi } from '../../features/notifications/notifications.api';
import { MockRealtimeTransport } from './mock-realtime.transport';
import {
  RealtimeEvent,
  RealtimeStatus,
  SaleCreated,
  parseSaleCreated,
  realtimeBackoff,
} from './sale-created';
import { RealtimeTransport } from './realtime.transport';
import { StompRealtimeTransport } from './stomp-realtime.transport';

export const REALTIME_TRANSPORT = new InjectionToken<RealtimeTransport>('REALTIME_TRANSPORT', {
  providedIn: 'root',
  factory: () => (environment.useMockAuth ? new MockRealtimeTransport() : new StompRealtimeTransport()),
});

@Injectable({ providedIn: 'root' })
export class RealtimeClient {
  private readonly auth = inject(AuthStore);
  private readonly transport = inject(REALTIME_TRANSPORT);
  private readonly notifications = inject(NotificationsApi);

  private readonly statusState = signal<RealtimeStatus>('disconnected');
  private readonly eventState = signal<RealtimeEvent | null>(null);
  private stopped = true;
  private token: string | null = null;
  private retry = 0;
  private seq = 0;
  private timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private opening = false;

  readonly status = this.statusState.asReadonly();
  readonly event = this.eventState.asReadonly();
  readonly connected = computed(() => this.statusState() === 'connected');

  constructor() {
    effect(() => {
      const token = this.auth.token();
      const authed = this.auth.isAuthenticated();
      untracked(() => {
        if (!authed || !token) {
          this.stop();
          return;
        }
        this.start(token);
      });
    });
  }

  start(token: string): void {
    if (!this.stopped && this.token === token && (this.opening || this.statusState() !== 'disconnected')) {
      return;
    }

    this.stopped = false;
    this.token = token;
    this.retry = 0;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    this.token = null;
    this.retry = 0;
    this.opening = false;
    this.clearTimer();
    this.transport.stop();
    this.statusState.set('disconnected');
  }

  receive(raw: unknown): void {
    const sale = parseSaleCreated(raw);
    if (sale) {
      this.emit(sale);
    }
  }

  private open(): void {
    if (this.stopped || !this.token) {
      return;
    }

    this.clearTimer();
    this.opening = true;
    this.statusState.set('reconnecting');
    this.transport.start({
      url: toWebSocketUrl(environment.wsUrl),
      token: this.token,
      handlers: {
        onConnected: () => this.handleConnected(),
        onDisconnected: () => this.handleDisconnected(),
        onSale: (sale) => this.emit(sale),
        onNotification: (notification) => this.notifications.ingest(notification),
      },
    });
  }

  private handleConnected(): void {
    if (this.stopped) {
      return;
    }
    this.opening = false;
    this.retry = 0;
    this.statusState.set('connected');
  }

  private handleDisconnected(): void {
    this.opening = false;
    if (this.stopped) {
      this.statusState.set('disconnected');
      return;
    }

    this.statusState.set('reconnecting');
    const delay = realtimeBackoff(this.retry);
    this.retry += 1;
    this.timer = globalThis.setTimeout(() => this.open(), delay);
  }

  private emit(sale: SaleCreated): void {
    this.seq += 1;
    this.eventState.set({ seq: this.seq, sale });
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      globalThis.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export function toWebSocketUrl(path: string): string {
  if (path.startsWith('ws://') || path.startsWith('wss://')) {
    return path;
  }

  const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const prefix = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}//${globalThis.location.host}${prefix}`;
}
