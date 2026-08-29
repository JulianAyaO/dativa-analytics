import { createWidget } from '../widget.factory';
import { toWidgetQuery } from './widget-query.codec';
import { mapWidgetResult } from './widget-result.mapper';

describe('mapWidgetResult', () => {
  const query = toWidgetQuery(createWidget('kpi'));

  it('maps a ready KPI payload into the widget contract', () => {
    const result = mapWidgetResult(
      {
        status: 'ready',
        family: 'kpi',
        data: {
          family: 'kpi',
          value: 1200,
          previous: 1000,
          changePct: 0.2,
          sparkline: {
            categories: [{ key: '2026-08', label: 'ago 26' }],
            values: [1200],
          },
        },
      },
      query,
    );

    expect(result.status).toBe('ready');
    if (result.status !== 'ready' || result.data.family !== 'kpi') {
      throw new Error('expected kpi');
    }

    expect(result.query).toBe(query);
    expect(result.data.value).toBe(1200);
    expect(result.data.sparkline.values).toEqual([1200]);
  });

  it('keeps empty and error statuses without reading SQL-shaped data', () => {
    const empty = mapWidgetResult({ status: 'empty', family: 'kpi' }, query);
    const failed = mapWidgetResult(
      { status: 'error', family: 'kpi', message: 'Consulta inválida' },
      query,
    );

    expect(empty.status).toBe('empty');
    expect(failed).toEqual({
      status: 'error',
      query,
      family: 'kpi',
      message: 'Consulta inválida',
    });
  });
});
