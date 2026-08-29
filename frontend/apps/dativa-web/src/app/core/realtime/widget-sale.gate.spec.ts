import { createWidget } from '../../features/dashboards/widgets/widget.factory';
import { toWidgetQuery } from '../../features/dashboards/widgets/query/widget-query.codec';
import { emptyFilters, normalizeFilters } from '../../features/dashboards/filters/dashboard-filters';
import { mockSale } from './mock-realtime.transport';
import { WidgetSaleGate } from './widget-sale.gate';

const NOW = Date.UTC(2026, 7, 24, 15);

describe('WidgetSaleGate', () => {
  it('increments only for later sales that match the widget query', () => {
    const widget = createWidget('ranking');
    const query = toWidgetQuery(widget, emptyFilters());
    const caribe = toWidgetQuery(widget, normalizeFilters({ region: 'Caribe' }));
    const gate = new WidgetSaleGate();
    const sale = { ...mockSale(0, NOW), region: 'Amazonía' };

    gate.observe({ seq: 3, sale }, query);
    expect(gate.hits()).toBe(0);

    gate.observe({ seq: 4, sale }, query);
    expect(gate.hits()).toBe(1);

    gate.observe({ seq: 5, sale }, caribe);
    expect(gate.hits()).toBe(1);

    gate.observe({ seq: 6, sale: { ...sale, region: 'Caribe' } }, caribe);
    expect(gate.hits()).toBe(2);
  });

  it('does not refetch charts from a stale event when the outlet is created', () => {
    const widget = createWidget('pie');
    const query = toWidgetQuery(widget, emptyFilters());
    const gate = new WidgetSaleGate();
    const sale = mockSale(1, NOW);

    gate.observe({ seq: 9, sale }, query);
    gate.observe({ seq: 9, sale }, query);

    expect(gate.hits()).toBe(0);
  });
});
