import { createWidget, usesDimension, usesTopN } from './widget.factory';

describe('widget factory', () => {
  it('creates a widget with default layout size for its type', () => {
    const kpi = createWidget('kpi');
    const bar = createWidget('bar', { x: 3, y: 2 });

    expect(kpi.layout).toEqual({ x: 0, y: 0, cols: 3, rows: 2 });
    expect(bar.layout).toEqual({ x: 3, y: 2, cols: 6, rows: 4 });
    expect(kpi.config.dataset).toBe('sales');
  });

  it('only asks for a dimension or top N when the family needs it', () => {
    expect(usesDimension('kpi')).toBe(false);
    expect(usesDimension('line')).toBe(true);
    expect(usesTopN('ranking')).toBe(true);
    expect(usesTopN('table')).toBe(false);
  });
});
