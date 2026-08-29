import { familyForWidget, WIDGET_CATALOG } from './widget.registry';

describe('widget registry', () => {
  it('covers the eight MVP widget types', () => {
    expect(WIDGET_CATALOG.map((item) => item.type)).toEqual([
      'kpi',
      'line',
      'bar',
      'area',
      'pie',
      'table',
      'ranking',
      'progress',
    ]);
  });

  it('maps line, bar and area to the same renderer family', () => {
    expect(familyForWidget('line')).toBe('series');
    expect(familyForWidget('bar')).toBe('series');
    expect(familyForWidget('area')).toBe('series');
  });
});
