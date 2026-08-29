export const EXPLORER_COLUMNS = [
  { id: 'occurredAt', label: 'Fecha', numeric: false, sortable: true },
  { id: 'dataset', label: 'Fuente', numeric: false, sortable: false },
  { id: 'region', label: 'Región', numeric: false, sortable: true },
  { id: 'category', label: 'Categoría', numeric: false, sortable: true },
  { id: 'product', label: 'Producto', numeric: false, sortable: true },
  { id: 'seller', label: 'Vendedor', numeric: false, sortable: true },
  { id: 'quantity', label: 'Unidades', numeric: true, sortable: true },
  { id: 'unitPrice', label: 'Precio', numeric: true, sortable: true },
  { id: 'amount', label: 'Importe', numeric: true, sortable: true },
] as const;

export type ExplorerColumnId = (typeof EXPLORER_COLUMNS)[number]['id'];

export const DEFAULT_EXPLORER_COLUMNS: readonly ExplorerColumnId[] = EXPLORER_COLUMNS.map(
  (column) => column.id,
);

export const SORTABLE_EXPLORER_COLUMNS: readonly ExplorerColumnId[] = EXPLORER_COLUMNS.filter(
  (column) => column.sortable,
).map((column) => column.id);
