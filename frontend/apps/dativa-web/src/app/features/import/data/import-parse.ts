import * as XLSX from 'xlsx';

export type ImportFileKind = 'csv' | 'xlsx' | 'xls' | 'spreadsheetml';

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  sheets: string[];
  sheet: string;
  kind: ImportFileKind;
}

export interface RowIssue {
  row: number;
  message: string;
}

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMPORT_EXT = ['.csv', '.xls', '.xlsx'];

const ZIP_MAGIC = [0x50, 0x4b];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export function emptyTable(): ParsedTable {
  return { headers: [], rows: [], sheets: [], sheet: '', kind: 'csv' };
}

export function validateImportFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_IMPORT_EXT.some((ext) => name.endsWith(ext))) {
    return 'Usa un archivo CSV o Excel (.csv, .xls, .xlsx).';
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return 'El archivo supera 5 MB.';
  }
  if (file.size === 0) {
    return 'El archivo está vacío.';
  }
  return null;
}

export async function parseImportFile(file: File, sheet?: string): Promise<ParsedTable> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImportKind(bytes);
  if (!kind) {
    throw new Error('No se reconoció el formato. Usa un CSV o un Excel válido (.xls o .xlsx).');
  }
  if (kind === 'csv') {
    return parseDelimited(decodeSpreadsheetText(bytes));
  }
  return parseExcelBytes(bytes, kind, sheet);
}

export function sniffImportKind(input: Uint8Array | ArrayBuffer): ImportFileKind | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (startsWith(bytes, ZIP_MAGIC)) {
    return 'xlsx';
  }
  if (startsWith(bytes, OLE_MAGIC)) {
    return 'xls';
  }

  const text = decodeSpreadsheetText(bytes).trimStart();
  if (!text) {
    return null;
  }
  if (text.startsWith('PK')) {
    return null;
  }
  if (/^<\?xml/i.test(text) && /<Workbook[\s>]/i.test(text)) {
    return 'spreadsheetml';
  }
  if (looksLikeDelimited(text)) {
    return 'csv';
  }
  return null;
}

export function parseDelimited(text: string): ParsedTable {
  const records = parseCsvRecords(text.replace(/^\uFEFF/, ''));
  if (records.length === 0) {
    throw new Error('El CSV no tiene encabezados ni filas.');
  }
  const width = Math.max(...records.map((record) => record.length), 0);
  const padded = records.map((record) => padRow(record, width));
  const headers = padded[0]?.map((header, index) => header || `Columna ${index + 1}`) ?? [];
  const rows = padded.slice(1).filter((row) => row.some((cell) => cell.length > 0));
  return { headers, rows, sheets: [], sheet: '', kind: 'csv' };
}

function parseExcelBytes(bytes: Uint8Array, kind: Exclude<ImportFileKind, 'csv'>, sheet?: string): ParsedTable {
  let workbook: XLSX.WorkBook;
  try {
    workbook =
      kind === 'spreadsheetml'
        ? XLSX.read(decodeSpreadsheetText(bytes), { type: 'string', cellDates: true, raw: true })
        : XLSX.read(bytes, { type: 'array', cellDates: true, raw: true });
  } catch {
    throw new Error(
      kind === 'xls'
        ? 'No se pudo leer el archivo .xls. Comprueba que no esté dañado.'
        : 'No se pudo leer el archivo Excel. Comprueba que no esté dañado.',
    );
  }

  const sheets = (workbook.SheetNames ?? []).filter((name) => {
    const worksheet = workbook.Sheets[name];
    return worksheet && XLSX.utils.sheet_to_json(worksheet, { header: 1 }).length > 0;
  });
  if (sheets.length === 0) {
    throw new Error('El Excel no tiene hojas con datos.');
  }

  const selected = sheet && sheets.includes(sheet) ? sheet : (sheets[0] ?? '');
  const worksheet = workbook.Sheets[selected];
  if (!worksheet) {
    throw new Error('No se encontró la hoja seleccionada.');
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | boolean | null | undefined)[]>(worksheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  });
  const records = matrix
    .map((row) => (Array.isArray(row) ? row.map((cell) => cellToText(cell)) : []))
    .filter((row) => row.some((cell) => cell.length > 0));
  if (records.length === 0) {
    throw new Error('La hoja seleccionada no tiene encabezados ni filas.');
  }

  const width = Math.max(...records.map((record) => record.length), 0);
  const padded = records.map((record) => padRow(record, width));
  const headers = padded[0]?.map((header, index) => header || `Columna ${index + 1}`) ?? [];
  const rows = padded.slice(1);

  return { headers, rows, sheets, sheet: selected, kind };
}

function parseCsvRecords(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const records: string[][] = [];
  let row: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    const next = text[index + 1] ?? '';

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        records.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (quoted) {
    throw new Error('El CSV tiene comillas sin cerrar.');
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) {
    records.push(row);
  }
  return records;
}

function detectDelimiter(text: string): string {
  const sample = firstLogicalLine(text);
  const commas = countUnquoted(sample, ',');
  const semis = countUnquoted(sample, ';');
  const tabs = countUnquoted(sample, '\t');
  if (tabs > 0 && tabs >= commas && tabs >= semis) {
    return '\t';
  }
  return semis > commas ? ';' : ',';
}

function firstLogicalLine(text: string): string {
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    const next = text[index + 1] ?? '';
    if (char === '"') {
      if (quoted && next === '"') {
        index += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (!quoted && (char === '\n' || char === '\r')) {
      return text.slice(0, index);
    }
  }
  return text;
}

function countUnquoted(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? '';
    const next = line[index + 1] ?? '';
    if (char === '"') {
      if (quoted && next === '"') {
        index += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === delimiter) {
      count += 1;
    }
  }
  return count;
}

function looksLikeDelimited(text: string): boolean {
  const sample = text.slice(0, 4000);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(sample)) {
    return false;
  }
  const line = firstLogicalLine(sample);
  return countUnquoted(line, ',') > 0 || countUnquoted(line, ';') > 0 || countUnquoted(line, '\t') > 0;
}

function cellToText(value: string | number | Date | boolean | null | undefined): string {
  if (value == null || value === '') {
    return '';
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value).trim();
}

function padRow(row: string[], width: number): string[] {
  const next = row.slice(0, width);
  while (next.length < width) {
    next.push('');
  }
  return next;
}

function decodeSpreadsheetText(bytes: Uint8Array): string {
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  if (startsWith(bytes, [0xff, 0xfe])) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (startsWith(bytes, [0xfe, 0xff])) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }

  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const replacements = (utf8.match(/\uFFFD/g) ?? []).length;
  if (replacements === 0) {
    return utf8;
  }
  try {
    return new TextDecoder('windows-1252').decode(bytes);
  } catch {
    return utf8;
  }
}

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((value, index) => bytes[index] === value);
}
