import { signal } from '@angular/core';
import { WidgetQuery } from '../../features/dashboards/widgets/query/widget-query.models';
import { RealtimeEvent, saleAffectsQuery } from './sale-created';

export class WidgetSaleGate {
  private primed = false;
  private seen = 0;
  private readonly hitsState = signal(0);

  readonly hits = this.hitsState.asReadonly();

  observe(event: RealtimeEvent | null, query: WidgetQuery): void {
    if (!this.primed) {
      this.primed = true;
      this.seen = event?.seq ?? 0;
      return;
    }

    if (!event || event.seq === this.seen) {
      return;
    }

    this.seen = event.seq;
    if (saleAffectsQuery(event.sale, query)) {
      this.hitsState.update((hits) => hits + 1);
    }
  }
}
