import { DEFAULT_EXPLORER_COLUMNS } from '../explorer-columns';
import { CSV_MIME, EXCEL_MIME, rowsToCsv, rowsToExcel } from './transaction-export';
import { TransactionRow } from './transaction.models';
import { parseImportFile, sniffImportKind } from '../../import/data/import-parse';

const row: TransactionRow = {
  id: 'tx-0001',
  dataset: 'sales',
  occurredAt: '2026-08-20T09:00:00.000Z',
  region: 'Caribe',
  category: 'Electrónica',
  product: 'Auriculares',
  seller: 'Ana Pérez',
  quantity: 2,
  unitPrice: 12.5,
  amount: 25,
};

describe('transaction export', () => {
  it('writes a CSV with BOM and the selected columns', () => {
    const csv = rowsToCsv([row], ['occurredAt', 'seller', 'amount']);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Fecha;Vendedor;Importe');
    expect(csv).toContain('Ana Pérez');
    expect(csv).toContain('25');
  });

  it('writes a real xlsx zip that Excel can open without a format warning', async () => {
    const excel = rowsToExcel([row], [...DEFAULT_EXPLORER_COLUMNS]);
    const bytes = excel instanceof Uint8Array ? excel : new Uint8Array(excel);

    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(sniffImportKind(bytes)).toBe('xlsx');

    const table = await parseImportFile(
      new File([excel.slice().buffer], 'transacciones.xlsx', { type: EXCEL_MIME }),
    );
    expect(table.sheet).toBe('Transacciones');
    expect(table.headers).toContain('Producto');
    expect(table.rows[0]?.join(' ')).toContain('Auriculares');
    expect(table.rows[0]?.join(' ')).not.toMatch(/PK/);

    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('xl/styles.xml');
    expect(xml).toContain('FF0F766E');
    expect(xml).toContain('state="frozen"');
    expect(xml).toContain('autoFilter');
  });

  it('keeps csv mime and excel mime aligned with the file extension', () => {
    expect(CSV_MIME).toContain('text/csv');
    expect(EXCEL_MIME).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
