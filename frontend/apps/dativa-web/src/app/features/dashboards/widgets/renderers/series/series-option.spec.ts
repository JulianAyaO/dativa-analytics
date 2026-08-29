import { SeriesWidgetData } from '../../query/widget-query.models';
import { readChartTheme } from '../chart/chart-theme';
import { buildSeriesOption } from './series-option';

const sample: SeriesWidgetData = {
  family: 'series',
  variant: 'line',
  categories: [
    { key: 'a', label: 'Caribe' },
    { key: 'b', label: 'Amazonía' },
  ],
  series: [
    { id: 'current', label: 'Periodo actual', values: [10, 20] },
    { id: 'previous', label: 'Periodo anterior', values: [8, 17] },
  ],
};

describe('buildSeriesOption', () => {
  const theme = readChartTheme();

  it('reuses the same categories and toggles the series type', () => {
    const line = buildSeriesOption({ ...sample, variant: 'line' }, 'revenue', theme);
    const bar = buildSeriesOption({ ...sample, variant: 'bar' }, 'revenue', theme);
    const area = buildSeriesOption({ ...sample, variant: 'area' }, 'revenue', theme);

    const lineSeries = (line['series'] as Array<{ type: string; areaStyle?: unknown }>)[0];
    const barSeries = (bar['series'] as Array<{ type: string }>)[0];
    const areaSeries = (area['series'] as Array<{ type: string; areaStyle?: unknown }>)[0];

    expect(line['xAxis']).toEqual(bar['xAxis']);
    expect(lineSeries?.type).toBe('line');
    expect(barSeries?.type).toBe('bar');
    expect(areaSeries?.type).toBe('line');
    expect(lineSeries?.areaStyle).toBeUndefined();
    expect(areaSeries?.areaStyle).toBeTruthy();
  });
});
