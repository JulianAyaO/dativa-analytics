import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseDelimited,
  parseImportFile,
  sniffImportKind,
  validateImportFile,
} from './import-parse';
import { validateImportTable } from './import-validate';
import { suggestFieldMapping } from './import.schema';
import { SALES_IMPORT_SCHEMA } from './sales-import.schema';
import { rowsToExcel } from '../../explorer/data/transaction-export';
import { DEFAULT_EXPLORER_COLUMNS } from '../../explorer/explorer-columns';
import { TransactionRow } from '../../explorer/data/transaction.models';

const sampleRow: TransactionRow = {
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

describe('import parser', () => {
  it('maps Spanish headers and validates rows', () => {
    const table = parseDelimited(
      'Fecha;Región;Categoría;Producto;Vendedor;Unidades;Precio;Importe\n2026-08-01;Caribe;Moda;Chaqueta;Ana Pérez;2;10;20\n',
    );
    const mapping = suggestFieldMapping(SALES_IMPORT_SCHEMA, table.headers);
    expect(mapping.region).toBe('Región');
    const validated = validateImportTable(table, mapping, SALES_IMPORT_SCHEMA);
    expect(validated.valid).toHaveLength(1);
    expect(validated.valid[0]?.amount).toBe(20);
  });

  it('rejects invalid extensions', () => {
    expect(validateImportFile(new File(['x'], 'notes.txt'))).toContain('CSV o Excel');
  });

  it('reads CSV with BOM, semicolon and accents', async () => {
    const csv = '\uFEFFFecha;Región;Categoría;Producto;Vendedor;Unidades;Importe\n2026-08-01;Caribe;Moda;Chaqueta;Ana Pérez;2;20\n';
    const table = await parseImportFile(new File([csv], 'ventas.csv', { type: 'text/csv' }));
    expect(table.kind).toBe('csv');
    expect(table.headers).toContain('Región');
    expect(table.rows[0]?.[4]).toBe('Ana Pérez');
  });

  it('reads comma-separated CSV and quoted empty values', () => {
    const table = parseDelimited(
      'Fecha,Región,Categoría,Producto,Vendedor,Unidades,Importe\n2026-08-01,"Caribe, Norte",Moda,"",Ana Pérez,2,20\n',
    );
    expect(table.rows[0]?.[1]).toBe('Caribe, Norte');
    expect(table.rows[0]?.[3]).toBe('');
  });

  it('does not treat a real xlsx as text even if the name says csv', async () => {
    const bytes = rowsToExcel([sampleRow], [...DEFAULT_EXPLORER_COLUMNS]);
    expect(sniffImportKind(bytes)).toBe('xlsx');

    const table = await parseImportFile(new File([bytes.slice().buffer], 'datos.csv', { type: 'text/csv' }));
    expect(table.kind).toBe('xlsx');
    expect(table.headers.join(' ')).not.toMatch(/PK/);
    expect(table.headers).toContain('Fecha');
    expect(table.rows[0]?.join(' ')).toContain('Auriculares');
  });

  it('reads xlsx and lists several sheets', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Fecha', 'Región', 'Categoría', 'Producto', 'Vendedor', 'Unidades', 'Importe'],
        ['2026-08-01', 'Caribe', 'Moda', 'Chaqueta', 'Ana Pérez', 2, 20],
      ]),
      'Ventas',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Fecha', 'Región', 'Categoría', 'Producto', 'Vendedor', 'Unidades', 'Importe'],
        ['2026-08-02', 'Andina', 'Hogar', 'Lámpara', 'Luis Gómez', 1, 40],
      ]),
      'Pedidos',
    );
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const ventas = await parseImportFile(new File([bytes], 'libro.xlsx'));
    expect(ventas.sheets).toEqual(['Ventas', 'Pedidos']);
    expect(ventas.sheet).toBe('Ventas');
    expect(ventas.rows[0]?.[3]).toBe('Chaqueta');

    const pedidos = await parseImportFile(new File([bytes], 'libro.xlsx'), 'Pedidos');
    expect(pedidos.sheet).toBe('Pedidos');
    expect(pedidos.rows[0]?.[3]).toBe('Lámpara');
  });

  it('reads a BIFF .xls workbook', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Fecha', 'Región', 'Categoría', 'Producto', 'Vendedor', 'Unidades', 'Importe'],
        ['2026-08-01', 'Caribe', 'Moda', 'Chaqueta', 'Ana Pérez', 2, 20],
      ]),
      'Datos',
    );
    const bytes = XLSX.write(workbook, { bookType: 'xls', type: 'array' }) as ArrayBuffer;
    expect(sniffImportKind(bytes)).toBe('xls');
    const table = await parseImportFile(new File([bytes], 'datos.xls'));
    expect(table.kind).toBe('xls');
    expect(table.rows[0]?.[4]).toBe('Ana Pérez');
  });

  it('parses European amounts during validation', () => {
    const table = parseDelimited(
      'Fecha;Región;Categoría;Producto;Vendedor;Unidades;Importe\n2026-08-01;Caribe;Moda;Chaqueta;Ana Pérez;2;1.234,50\n',
    );
    const validated = validateImportTable(
      table,
      suggestFieldMapping(SALES_IMPORT_SCHEMA, table.headers),
      SALES_IMPORT_SCHEMA,
    );
    expect(validated.valid[0]?.amount).toBe(1234.5);
  });

  it('rejects binary-looking content with a clear error', async () => {
    const garbage = new Uint8Array([0, 1, 2, 3, 4, 5, 0, 7, 8]);
    await expect(parseImportFile(new File([garbage], 'roto.xlsx'))).rejects.toThrow(/Excel válido|reconoc/i);
  });
});
