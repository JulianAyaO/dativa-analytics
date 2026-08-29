import { beforeEach, describe, expect, it } from 'vitest';
import { parseDelimited } from './import-parse';
import { rowFingerprint } from './import-fingerprint';
import { suggestFieldMapping } from './import.schema';
import { validateImportTable } from './import-validate';
import { appendImportedRows, readImportedRows } from './imported-store';
import { SALES_IMPORT_SCHEMA } from './sales-import.schema';
import { TransactionRow } from '../../explorer/data/transaction.models';

const csv = (body: string) =>
  parseDelimited(`Fecha;Región;Categoría;Producto;Vendedor;Unidades;Precio;Importe\n${body}`);

const mapping = () =>
  suggestFieldMapping(SALES_IMPORT_SCHEMA, [
    'Fecha',
    'Región',
    'Categoría',
    'Producto',
    'Vendedor',
    'Unidades',
    'Precio',
    'Importe',
  ]);

const line = '2026-08-01;Caribe;Moda;Chaqueta;Ana Pérez;2;10;20';

describe('import duplicates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the first row and skips repeats in the same file', () => {
    const table = csv(`${line}\n${line}\n2026-08-02;Andina;Moda;Chaqueta;Ana Pérez;1;10;10\n`);
    const validated = validateImportTable(table, mapping(), SALES_IMPORT_SCHEMA);

    expect(validated.valid).toHaveLength(2);
    expect(validated.duplicatesInFile).toBe(1);
    expect(validated.alreadyImported).toBe(0);
    expect(validated.issues.some((issue) => issue.kind === 'file' && issue.row === 3)).toBe(true);
  });

  it('treats the same line with different casing or accents as a duplicate', () => {
    const table = csv(`${line}\n2026-08-01;caribe;moda;chaqueta;ana perez;2;10;20\n`);
    const validated = validateImportTable(table, mapping(), SALES_IMPORT_SCHEMA);

    expect(validated.valid).toHaveLength(1);
    expect(validated.duplicatesInFile).toBe(1);
  });

  it('does not import a row that already exists in the dataset', () => {
    const table = csv(`${line}\n`);
    const first = validateImportTable(table, mapping(), SALES_IMPORT_SCHEMA);
    const existing: TransactionRow[] = first.valid;
    const again = validateImportTable(table, mapping(), SALES_IMPORT_SCHEMA, existing);

    expect(again.valid).toHaveLength(0);
    expect(again.alreadyImported).toBe(1);
    expect(again.issues[0]?.message).toContain('ya existe en Ventas');
  });

  it('does not append the same imported rows twice', () => {
    const table = csv(`${line}\n`);
    const validated = validateImportTable(table, mapping(), SALES_IMPORT_SCHEMA);
    const first = appendImportedRows('sales', validated.valid);
    const second = appendImportedRows('sales', validated.valid);

    expect(first.added).toHaveLength(1);
    expect(second.added).toHaveLength(0);
    expect(second.skipped).toBe(1);
    expect(readImportedRows().sales).toHaveLength(1);
  });

  it('uses a stable fingerprint for equivalent rows', () => {
    expect(
      rowFingerprint({
        dataset: 'sales',
        occurredAt: '2026-08-01T00:00:00.000Z',
        region: 'Caribe',
        category: 'Moda',
        product: 'Chaqueta',
        seller: 'Ana Pérez',
        quantity: 2,
        unitPrice: 10,
        amount: 20,
      }),
    ).toBe(
      rowFingerprint({
        dataset: 'sales',
        occurredAt: '2026-08-01T00:00:00Z',
        region: '  CARIBE ',
        category: 'moda',
        product: 'Chaqueta',
        seller: 'ANA PEREZ',
        quantity: 2,
        unitPrice: 10,
        amount: 20,
      }),
    );
  });
});
