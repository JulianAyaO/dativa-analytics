import { ImportSchema } from './import.schema';

export const SALES_IMPORT_SCHEMA: ImportSchema = {
  dataset: 'sales',
  name: 'Ventas',
  description: 'Líneas de venta para ingresos, unidades y ticket promedio.',
  fields: [
    {
      id: 'occurredAt',
      label: 'Fecha',
      required: true,
      kind: 'date',
      aliases: ['fecha', 'fechaventa', 'date', 'occurredat', 'fechadeventa'],
    },
    {
      id: 'region',
      label: 'Región',
      required: true,
      kind: 'text',
      aliases: ['region', 'zona', 'territorio', 'departamento'],
    },
    {
      id: 'category',
      label: 'Categoría',
      required: true,
      kind: 'text',
      aliases: ['categoria', 'category', 'linea', 'rubro'],
    },
    {
      id: 'product',
      label: 'Producto',
      required: true,
      kind: 'text',
      aliases: ['producto', 'product', 'articulo', 'item', 'sku', 'referencia'],
    },
    {
      id: 'seller',
      label: 'Vendedor',
      required: true,
      kind: 'text',
      aliases: ['vendedor', 'seller', 'empleado', 'asesor', 'comercial'],
    },
    {
      id: 'quantity',
      label: 'Unidades',
      required: true,
      kind: 'number',
      aliases: ['unidades', 'quantity', 'cantidad', 'cant', 'qty'],
    },
    {
      id: 'unitPrice',
      label: 'Precio',
      required: false,
      kind: 'number',
      aliases: ['precio', 'price', 'unitprice', 'valorunitario', 'preciounitario'],
    },
    {
      id: 'amount',
      label: 'Importe',
      required: true,
      kind: 'number',
      aliases: ['importe', 'amount', 'total', 'valortotal', 'monto'],
    },
  ],
};
