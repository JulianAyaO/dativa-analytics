import { WidgetFamily } from '../widget.models';
import { familyForWidget } from '../widget.registry';
import { WidgetData, WidgetQuery, WidgetResult } from './widget-query.models';

export function mapWidgetResult(raw: unknown, query: WidgetQuery): WidgetResult {
  const family = familyForWidget(query.type);
  if (!isRecord(raw)) {
    throw new Error('Respuesta analítica inválida');
  }

  const status = raw['status'];
  if (status === 'empty') {
    return { status: 'empty', query, family };
  }

  if (status === 'error') {
    return {
      status: 'error',
      query,
      family,
      message: readString(raw['message']) || 'No se pudieron cargar los datos del widget.',
    };
  }

  if (status !== 'ready' || !isRecord(raw['data'])) {
    throw new Error('Respuesta analítica inválida');
  }

  return {
    status: 'ready',
    query,
    family,
    data: mapWidgetData(raw['data'], family, query),
  };
}

function mapWidgetData(raw: Record<string, unknown>, family: WidgetFamily, query: WidgetQuery): WidgetData {
  switch (family) {
    case 'kpi': {
      const sparkline = isRecord(raw['sparkline']) ? raw['sparkline'] : {};
      return {
        family,
        value: readNumber(raw['value']),
        previous: readNumber(raw['previous']),
        changePct: raw['changePct'] == null ? null : readNumber(raw['changePct']),
        sparkline: {
          categories: readCategories(sparkline['categories']),
          values: readNumbers(sparkline['values']),
        },
      };
    }
    case 'series':
      return {
        family,
        variant: seriesVariant(query.type),
        categories: readCategories(raw['categories']),
        series: readSeries(raw['series']),
      };
    case 'composition':
      return {
        family,
        total: readNumber(raw['total']),
        slices: readCategories(raw['slices']).map((slice, index) => ({
          ...slice,
          value: readNumber(itemAt(raw['slices'], index)?.['value']),
        })),
      };
    case 'table':
      return {
        family,
        dimensionLabel: readString(raw['dimensionLabel']) || 'Dimensión',
        metricLabel: readString(raw['metricLabel']) || 'Métrica',
        rows: readCategories(raw['rows']).map((row, index) => ({
          ...row,
          value: readNumber(itemAt(raw['rows'], index)?.['value']),
          share: readNumber(itemAt(raw['rows'], index)?.['share']),
        })),
      };
    case 'ranking':
      return {
        family,
        items: readList(raw['items']).map((item, index) => ({
          rank: readNumber(item['rank']) || index + 1,
          key: readString(item['key']),
          label: readString(item['label']),
          value: readNumber(item['value']),
          share: readNumber(item['share']),
        })),
      };
    case 'progress':
      return {
        family,
        value: readNumber(raw['value']),
        target: readNumber(raw['target']),
        ratio: readNumber(raw['ratio']),
      };
    default:
      throw new Error('Familia de widget no soportada');
  }
}

function seriesVariant(type: WidgetQuery['type']): 'line' | 'bar' | 'area' {
  if (type === 'bar') {
    return 'bar';
  }
  if (type === 'area') {
    return 'area';
  }
  return 'line';
}

function readCategories(raw: unknown): Array<{ key: string; label: string }> {
  return readList(raw).map((item) => ({
    key: readString(item['key']),
    label: readString(item['label']) || readString(item['key']),
  }));
}

function readSeries(raw: unknown): Array<{ id: string; label: string; values: number[] }> {
  return readList(raw).map((item) => ({
    id: readString(item['id']),
    label: readString(item['label']),
    values: readNumbers(item['values']),
  }));
}

function readList(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isRecord);
}

function itemAt(raw: unknown, index: number): Record<string, unknown> | null {
  if (!Array.isArray(raw) || !isRecord(raw[index])) {
    return null;
  }

  return raw[index];
}

function readNumbers(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => readNumber(item));
}

function readNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
