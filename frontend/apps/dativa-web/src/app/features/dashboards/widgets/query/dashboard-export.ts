import { Dashboard } from '../../models/dashboard.models';
import { DashboardFilters } from '../../filters/dashboard-filters';
import { WidgetInstance } from '../widget.models';
import { WIDGET_CATALOG } from '../widget.registry';
import { toWidgetQuery } from './widget-query.codec';
import { WidgetData, WidgetQuery, WidgetResult } from './widget-query.models';
import { ExcelCell, ExcelSheet, writeStyledSheets } from '../../../explorer/data/xlsx-workbook';
import { snapshotWidget } from './widget-snapshot';

export async function dashboardToExcel(
  dashboard: Dashboard,
  filters: DashboardFilters,
  execute: (query: WidgetQuery) => Promise<WidgetResult>,
): Promise<Uint8Array> {
  const widgets = dashboard.widgets;
  if (widgets.length === 0) {
    return writeStyledSheets([
      {
        name: 'Dashboard',
        headers: ['Dashboard', 'Estado'],
        rows: [[{ kind: 'text', value: dashboard.name }, { kind: 'text', value: 'Sin widgets' }]],
        widths: [28, 18],
      },
    ]);
  }

  const results = await Promise.all(
    widgets.map(async (widget) => ({
      widget,
      result: await execute(toWidgetQuery(widget, filters)),
    })),
  );

  return writeStyledSheets(
    await Promise.all(results.map(({ widget, result }) => sheetForWidget(widget, result))),
  );
}

export function dashboardExportFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${slug || 'dashboard'}.xlsx`;
}

async function sheetForWidget(widget: WidgetInstance, result: WidgetResult): Promise<ExcelSheet> {
  const typeLabel = WIDGET_CATALOG.find((item) => item.type === widget.type)?.label ?? widget.type;
  const name = `${widget.title || typeLabel}`;
  if (result.status !== 'ready') {
    return {
      name,
      headers: ['Widget', 'Tipo', 'Estado'],
      rows: [
        [
          { kind: 'text', value: widget.title },
          { kind: 'text', value: typeLabel },
          { kind: 'text', value: result.status === 'empty' ? 'Sin datos' : result.message },
        ],
      ],
      widths: [28, 14, 36],
    };
  }

  const sheet = dataSheet(name, result.data, widget.config.metric);
  return {
    ...sheet,
    image: await snapshotWidget(result.data, widget.config.metric, widget.title || typeLabel),
  };
}

function dataSheet(name: string, data: WidgetData, metric: WidgetInstance['config']['metric']): ExcelSheet {
  const numberKind = metric === 'revenue' || metric === 'avg_ticket' ? 'money' : 'integer';

  if (data.family === 'kpi') {
    return {
      name,
      headers: ['Indicador', 'Valor', 'Anterior', 'Variación'],
      rows: [
        [
          { kind: 'text', value: name },
          { kind: numberKind, value: data.value },
          { kind: numberKind, value: data.previous },
          { kind: 'text', value: data.changePct === null ? 's/d' : `${(data.changePct * 100).toFixed(1)}%` },
        ],
      ],
      widths: [28, 16, 16, 14],
    };
  }

  if (data.family === 'progress') {
    return {
      name,
      headers: ['Valor', 'Objetivo', 'Avance'],
      rows: [
        [
          { kind: numberKind, value: data.value },
          { kind: numberKind, value: data.target },
          { kind: 'text', value: `${Math.round(data.ratio * 100)}%` },
        ],
      ],
      widths: [16, 16, 12],
    };
  }

  if (data.family === 'series') {
    const headers = ['Categoría', ...data.series.map((series) => series.label)];
    return {
      name,
      headers,
      rows: data.categories.map((category, row) => [
        { kind: 'text', value: category.label },
        ...data.series.map((series) => ({ kind: numberKind, value: series.values[row] ?? 0 }) satisfies ExcelCell),
      ]),
      widths: [22, ...data.series.map(() => 16)],
    };
  }

  if (data.family === 'composition') {
    return {
      name,
      headers: ['Categoría', 'Valor'],
      rows: data.slices.map((slice) => [
        { kind: 'text', value: slice.label },
        { kind: numberKind, value: slice.value },
      ]),
      widths: [22, 16],
    };
  }

  if (data.family === 'ranking') {
    return {
      name,
      headers: ['Nombre', 'Valor'],
      rows: data.items.map((item) => [
        { kind: 'text', value: item.label },
        { kind: numberKind, value: item.value },
      ]),
      widths: [24, 16],
    };
  }

  return {
    name,
    headers: [data.dimensionLabel, data.metricLabel],
    rows: data.rows.map((row) => [
      { kind: 'text', value: row.label },
      { kind: numberKind, value: row.value },
    ]),
    widths: [24, 16],
  };
}
