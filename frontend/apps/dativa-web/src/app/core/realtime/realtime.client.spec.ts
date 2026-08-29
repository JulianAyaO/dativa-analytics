import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { REALTIME_TRANSPORT, RealtimeClient } from './realtime.client';
import { RealtimeTransport, RealtimeTransportStart } from './realtime.transport';
import { REALTIME_BACKOFF_MS } from './sale-created';
import { mockSale } from './mock-realtime.transport';

class FakeTransport implements RealtimeTransport {
  starts = 0;
  stops = 0;
  last: RealtimeTransportStart | null = null;

  start(options: RealtimeTransportStart): void {
    this.starts += 1;
    this.last = options;
  }

  stop(): void {
    this.stops += 1;
  }
}

describe('RealtimeClient', () => {
  let transport: FakeTransport;
  let client: RealtimeClient;

  beforeEach(() => {
    sessionStorage.clear();
    transport = new FakeTransport();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        { provide: REALTIME_TRANSPORT, useValue: transport },
      ],
    });

    client = TestBed.inject(RealtimeClient);
    vi.useFakeTimers();
  });

  afterEach(() => {
    client.stop();
    vi.useRealTimers();
  });

  it('connects once and keeps a single transport across start calls', () => {
    client.start('token-1');
    client.start('token-1');

    expect(transport.starts).toBe(1);
    expect(client.status()).toBe('reconnecting');

    transport.last?.handlers.onConnected();
    expect(client.status()).toBe('connected');

    client.start('token-1');
    expect(transport.starts).toBe(1);
  });

  it('reconnects with backoff after a drop', () => {
    client.start('token-1');
    transport.last?.handlers.onConnected();
    transport.last?.handlers.onDisconnected();

    expect(client.status()).toBe('reconnecting');
    expect(transport.starts).toBe(1);

    vi.advanceTimersByTime(REALTIME_BACKOFF_MS[0]);
    expect(transport.starts).toBe(2);

    transport.last?.handlers.onDisconnected();
    vi.advanceTimersByTime(REALTIME_BACKOFF_MS[1] - 1);
    expect(transport.starts).toBe(2);
    vi.advanceTimersByTime(1);
    expect(transport.starts).toBe(3);
  });

  it('does not reconnect after an intentional disconnect', () => {
    client.start('token-1');
    transport.last?.handlers.onConnected();
    client.stop();
    transport.last?.handlers.onDisconnected();

    vi.advanceTimersByTime(30_000);
    expect(client.status()).toBe('disconnected');
    expect(transport.starts).toBe(1);
  });

  it('exposes typed sales without opening a second socket', () => {
    client.start('token-1');
    transport.last?.handlers.onConnected();
    transport.last?.handlers.onSale(mockSale(4, Date.UTC(2026, 7, 24)));

    expect(client.event()?.sale.id).toBe('live-4');
    expect(transport.starts).toBe(1);
  });
});
