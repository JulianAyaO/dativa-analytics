import { MOCK_DIMENSIONS } from '../../features/dashboards/widgets/query/mock-analytics';
import { SaleCreated } from './sale-created';
import { RealtimeTransport, RealtimeTransportStart } from './realtime.transport';

const TICK_MS = 12_000;

export class MockRealtimeTransport implements RealtimeTransport {
  private connectTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private tickTimer: ReturnType<typeof globalThis.setInterval> | null = null;
  private handlers: RealtimeTransportStart['handlers'] | null = null;
  private index = 0;

  start(options: RealtimeTransportStart): void {
    this.stopTimers();
    this.handlers = options.handlers;
    this.connectTimer = globalThis.setTimeout(() => {
      this.handlers?.onConnected();
      this.tickTimer = globalThis.setInterval(() => this.emit(), TICK_MS);
    }, 40);
  }

  stop(): void {
    this.stopTimers();
    this.handlers = null;
  }

  private emit(): void {
    this.handlers?.onSale(mockSale(this.index));
    this.index += 1;
  }

  private stopTimers(): void {
    if (this.connectTimer !== null) {
      globalThis.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    if (this.tickTimer !== null) {
      globalThis.clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
}

export function mockSale(index: number, now = Date.now()): SaleCreated {
  const regions = MOCK_DIMENSIONS.REGIONS;
  const categories = MOCK_DIMENSIONS.CATEGORIES;
  const products = MOCK_DIMENSIONS.PRODUCTS;
  const sellers = MOCK_DIMENSIONS.SELLERS;
  const quantity = 1 + (index % 3);

  return {
    type: 'SaleCreated',
    id: `live-${index}`,
    dataset: 'sales',
    occurredAt: new Date(now).toISOString(),
    region: regions[index % regions.length] ?? 'Caribe',
    category: categories[(index + 1) % categories.length] ?? 'Electrónica',
    product: products[(index + 2) % products.length] ?? 'Auriculares',
    seller: sellers[(index + 3) % sellers.length] ?? 'Ana Pérez',
    quantity,
    amount: (102_900 + (index % 7) * 35_280) * quantity,
  };
}
