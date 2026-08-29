import { EXPLORER_COLUMNS, ExplorerColumnId } from '../explorer-columns';
import { TransactionRow } from './transaction.models';
import { ExcelCell, writeStyledWorkbook } from './xlsx-workbook';

const DATE = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const COLUMN_WIDTH: Record<ExplorerColumnId, number> = {
  occurredAt: 22,
  dataset: 12,
  region: 16,
  category: 16,
  product: 22,
  seller: 18,
  quantity: 12,
  unitPrice: 14,
  amount: 14,
};

export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_MIME = 'text/csv;charset=utf-8';

export function rowsToCsv(rows: TransactionRow[], columns: ExplorerColumnId[]): string {
  const header = columns.map((id) => labelOf(id)).join(';');
  const body = rows.map((row) => columns.map((id) => csvCell(csvValue(row, id))).join(';')).join('\r\n');
  return `\uFEFF${header}\r\n${body}\r\n`;
}

export function rowsToExcel(rows: TransactionRow[], columns: ExplorerColumnId[]): Uint8Array {
  const header = columns.map((id) => labelOf(id));
  const body = rows.map((row) => columns.map((id) => excelCell(row, id)));
  return writeStyledWorkbook(
    'Transacciones',
    header,
    body,
    columns.map((id) => COLUMN_WIDTH[id]),
  );
}

export function downloadBlob(body: Blob, filename: string): void {
  const href = URL.createObjectURL(body);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function excelCell(row: TransactionRow, column: ExplorerColumnId): ExcelCell {
  switch (column) {
    case 'occurredAt': {
      const date = new Date(row.occurredAt);
      return Number.isNaN(date.getTime())
        ? { kind: 'text', value: row.occurredAt }
        : { kind: 'date', value: date };
    }
    case 'dataset':
      return { kind: 'text', value: row.dataset === 'orders' ? 'Pedidos' : 'Ventas' };
    case 'quantity':
      return { kind: 'integer', value: row.quantity };
    case 'unitPrice':
    case 'amount':
      return { kind: 'money', value: row[column] };
    default:
      return { kind: 'text', value: String(row[column]) };
  }
}

function csvValue(row: TransactionRow, column: ExplorerColumnId): string {
  switch (column) {
    case 'occurredAt':
      return DATE.format(new Date(row.occurredAt));
    case 'dataset':
      return row.dataset === 'orders' ? 'Pedidos' : 'Ventas';
    case 'unitPrice':
    case 'amount':
      return String(Math.round(row[column]));
    default:
      return String(row[column]);
  }
}

function labelOf(id: ExplorerColumnId): string {
  return EXPLORER_COLUMNS.find((column) => column.id === id)?.label ?? id;
}

function csvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

