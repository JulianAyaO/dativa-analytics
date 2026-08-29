import { describe, expect, it } from 'vitest';
import { parseDelimited } from './import-parse';
import {
  missingRequiredMessage,
  suggestColumnMapping,
  suggestFieldMapping,
  toFieldMapping,
} from './import.schema';
import { validateImportTable } from './import-validate';
import { ORDERS_IMPORT_SCHEMA } from './orders-import.schema';
import { SALES_IMPORT_SCHEMA } from './sales-import.schema';
import { schemaFor } from './import.schemas';

describe('import schemas', () => {
  it('keeps Ventas and Pedidos as independent schemas', () => {
    expect(schemaFor('sales')).toBe(SALES_IMPORT_SCHEMA);
    expect(schemaFor('orders')).toBe(ORDERS_IMPORT_SCHEMA);
    expect(SALES_IMPORT_SCHEMA.fields).not.toEqual(ORDERS_IMPORT_SCHEMA.fields);
    expect(SALES_IMPORT_SCHEMA.fields.find((field) => field.id === 'seller')?.required).toBe(true);
    expect(ORDERS_IMPORT_SCHEMA.fields.find((field) => field.id === 'seller')?.required).toBe(false);
    expect(ORDERS_IMPORT_SCHEMA.fields.find((field) => field.id === 'category')?.required).toBe(false);
  });

  it('suggests sales aliases without importing automatically', () => {
    const headers = [
      'Fecha venta',
      'Zona',
      'Categoría',
      'Artículo',
      'Empleado',
      'Cant.',
      'Valor unitario',
      'Total',
      'Cliente',
      'Ciudad',
    ];
    const columns = suggestColumnMapping(SALES_IMPORT_SCHEMA, headers);

    expect(columns['Fecha venta']).toBe('occurredAt');
    expect(columns['Zona']).toBe('region');
    expect(columns['Artículo']).toBe('product');
    expect(columns['Empleado']).toBe('seller');
    expect(columns['Cant.']).toBe('quantity');
    expect(columns['Valor unitario']).toBe('unitPrice');
    expect(columns['Total']).toBe('amount');
    expect(columns['Cliente']).toBe('');
    expect(columns['Ciudad']).toBe('');
  });

  it('lets extra columns be ignored without blocking a complete sales mapping', () => {
    const table = parseDelimited(
      'Fecha;Región;Producto;Unidades;Cliente;Ciudad;Categoría;Vendedor;Importe\n2026-08-01;Caribe;Chaqueta;2;ACME;Barranquilla;Moda;Ana Pérez;20\n',
    );
    const columns = suggestColumnMapping(SALES_IMPORT_SCHEMA, table.headers);
    expect(columns['Cliente']).toBe('');
    expect(columns['Ciudad']).toBe('');
    expect(missingRequiredMessage(SALES_IMPORT_SCHEMA, toFieldMapping(columns))).toBeNull();

    const validated = validateImportTable(table, toFieldMapping(columns), SALES_IMPORT_SCHEMA);
    expect(validated.valid).toHaveLength(1);
    expect(validated.valid[0]?.product).toBe('Chaqueta');
  });

  it('blocks sales when a required field is missing', () => {
    const mapping = suggestFieldMapping(SALES_IMPORT_SCHEMA, [
      'Región',
      'Categoría',
      'Producto',
      'Vendedor',
      'Unidades',
      'Importe',
    ]);
    expect(missingRequiredMessage(SALES_IMPORT_SCHEMA, mapping)).toBe(
      'No se puede importar este archivo como Ventas. Falta el campo obligatorio: Fecha.',
    );
  });

  it('imports orders without sales-only required fields', () => {
    const table = parseDelimited(
      'Fecha pedido;Zona;Artículo;Cant.;Total;Cliente\n2026-08-01;Caribe;Chaqueta;2;20;ACME\n',
    );
    const mapping = suggestFieldMapping(ORDERS_IMPORT_SCHEMA, table.headers);
    expect(missingRequiredMessage(ORDERS_IMPORT_SCHEMA, mapping)).toBeNull();
    expect(mapping.category).toBe('');
    expect(mapping.seller).toBe('');

    const validated = validateImportTable(table, mapping, ORDERS_IMPORT_SCHEMA);
    expect(validated.valid).toHaveLength(1);
    expect(validated.valid[0]?.dataset).toBe('orders');
    expect(validated.valid[0]?.category).toBe('Sin categoría');
    expect(validated.valid[0]?.seller).toBe('Sin asignar');
  });
});
