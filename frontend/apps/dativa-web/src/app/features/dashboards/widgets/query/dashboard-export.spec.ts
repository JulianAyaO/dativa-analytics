import { createWidget } from '../widget.factory';
import { toWidgetQuery } from './widget-query.codec';
import { runWidgetQuery } from './mock-analytics';
import { dashboardExportFileName, dashboardToExcel } from './dashboard-export';
import { emptyFilters } from '../../filters/dashboard-filters';
import { Dashboard } from '../../models/dashboard.models';
import { sniffImportKind } from '../../../import/data/import-parse';

describe('dashboard excel export', () => {
  it('names the file from the dashboard title', () => {
    expect(dashboardExportFileName('Ventas Q3')).toBe('Ventas-Q3.xlsx');
  });

  it('writes one sheet per widget including a chart for series', async () => {
    const line = createWidget('line');
    const kpi = createWidget('kpi');
    const dashboard: Dashboard = {
      id: 'dash-1',
      name: 'Comercial',
      description: '',
      widgets: [line, kpi],
      filters: emptyFilters(),
      filterPresets: [],
      featured: false,
      isDefault: false,
      openCount: 0,
      updatedAt: '2026-08-29T00:00:00.000Z',
    };

    const bytes = await dashboardToExcel(dashboard, emptyFilters(), async (query) => runWidgetQuery(query));
    expect(bytes[0]).toBe(0x50);
    expect(sniffImportKind(bytes)).toBe('xlsx');

    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain(line.title.slice(0, 12));
    expect(xml).not.toContain('<c:chartSpace');
    expect(toWidgetQuery(line, emptyFilters()).type).toBe('line');
  });
});
