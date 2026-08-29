import { createWidget } from '../widget.factory';
import { emptyFilters } from '../../filters/dashboard-filters';
import { parseWidgetQuery, serializeWidgetQuery, toWidgetQuery } from './widget-query.codec';

describe('widget query codec', () => {
  it('keeps the serialized key stable when only the title changes', () => {
    const widget = createWidget('kpi');
    const first = serializeWidgetQuery({ ...widget, title: 'Ingresos' });
    const second = serializeWidgetQuery({ ...widget, title: 'Ingresos Q1' });

    expect(first).toBe(second);
  });

  it('includes filters in the query contract', () => {
    const widget = createWidget('bar');
    const query = toWidgetQuery(widget, { region: 'Caribe' });

    expect(query.filters.region).toBe('Caribe');
    expect(query.filters.category).toBe('');

    const serialized = serializeWidgetQuery(widget, query.filters);
    const parsed = parseWidgetQuery(serialized);

    expect(serialized).not.toBe(serializeWidgetQuery(widget));
    expect(parsed.filters.region).toBe('Caribe');
    expect(parsed.type).toBe('bar');
  });

  it('defaults missing filters when parsing a legacy payload', () => {
    const parsed = parseWidgetQuery(
      JSON.stringify({
        type: 'kpi',
        dataset: 'sales',
        metric: 'revenue',
        dimension: null,
        period: 'last_12_months',
        topN: null,
      }),
    );

    expect(parsed.filters).toEqual(emptyFilters());
  });
});
