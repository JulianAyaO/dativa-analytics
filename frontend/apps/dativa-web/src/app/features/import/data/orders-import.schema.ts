import { ImportSchema } from './import.schema';

export const ORDERS_IMPORT_SCHEMA: ImportSchema = {
  dataset: 'orders',
  name: 'Pedidos',
  description: 'Pedidos y sus líneas para contar órdenes, unidades e importe.',
  fields: [
    {
      id: 'occurredAt',
      label: 'Fecha del pedido',
      required: true,
      kind: 'date',
      aliases: ['fecha', 'fechapedido', 'fechaorden', 'orderedat', 'date', 'fechadeorden'],
    },
    {
      id: 'region',
      label: 'Región',
      required: true,
      kind: 'text',
      aliases: ['region', 'zona', 'territorio', 'sucursal'],
    },
    {
      id: 'category',
      label: 'Categoría',
      required: false,
      kind: 'text',
      aliases: ['categoria', 'category', 'linea', 'familia'],
      fallback: 'Sin categoría',
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
      label: 'Responsable',
      required: false,
      kind: 'text',
      aliases: ['responsable', 'vendedor', 'asesor', 'comercial', 'seller', 'empleado'],
      fallback: 'Sin asignar',
    },
    {
      id: 'quantity',
      label: 'Unidades',
      required: true,
      kind: 'number',
      aliases: ['unidades', 'cantidad', 'cant', 'qty', 'quantity'],
    },
    {
      id: 'unitPrice',
      label: 'Precio unitario',
      required: false,
      kind: 'number',
      aliases: ['preciounitario', 'valorunitario', 'precio', 'tarifa', 'unitprice'],
    },
    {
      id: 'amount',
      label: 'Importe',
      required: true,
      kind: 'number',
      aliases: ['importe', 'total', 'monto', 'valortotal', 'amount'],
    },
  ],
};
