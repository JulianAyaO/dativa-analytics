const CRC_TABLE = buildCrcTable();

export type ExcelCellKind = 'text' | 'date' | 'integer' | 'money';

export interface ExcelCell {
  kind: ExcelCellKind;
  value: string | number | Date;
}

export interface ExcelImage {
  png: Uint8Array;
  widthPx: number;
  heightPx: number;
}

export interface ExcelSheet {
  name: string;
  headers: readonly string[];
  rows: readonly ExcelCell[][];
  widths: readonly number[];
  image?: ExcelImage;
}

export function writeStyledWorkbook(
  sheetName: string,
  headers: readonly string[],
  rows: readonly ExcelCell[][],
  widths: readonly number[],
): Uint8Array {
  return writeStyledSheets([{ name: sheetName, headers, rows, widths }]);
}

export function writeStyledSheets(input: readonly ExcelSheet[]): Uint8Array {
  const sheets = uniqueSheets(input.length ? input : [{ name: 'Hoja1', headers: [''], rows: [], widths: [14] }]);
  const images: Array<{ sheetIndex: number; imageIndex: number; sheet: ExcelSheet }> = [];
  sheets.forEach((sheetSpec, sheetIndex) => {
    if (sheetSpec.image?.png.length) {
      images.push({ sheetIndex, imageIndex: images.length + 1, sheet: sheetSpec });
    }
  });
  const files: { name: string; data: Uint8Array }[] = [
    { name: '[Content_Types].xml', data: utf8(contentTypes(sheets.length, images.length)) },
    { name: '_rels/.rels', data: utf8(packageRels()) },
    { name: 'xl/workbook.xml', data: utf8(workbookXml(sheets)) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(workbookRels(sheets.length)) },
    { name: 'xl/styles.xml', data: utf8(styles()) },
  ];
  sheets.forEach((sheetSpec, index) => {
    const lastCol = columnLetter(Math.max(sheetSpec.headers.length, 1) - 1);
    const lastRow = Math.max(sheetSpec.rows.length + 1, 1);
    const image = images.find((item) => item.sheetIndex === index);
    files.push({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: utf8(sheet(sheetSpec.headers, sheetSpec.rows, sheetSpec.widths, lastCol, lastRow, index === 0, Boolean(image))),
    });
    if (image && sheetSpec.image) {
      files.push({
        name: `xl/worksheets/_rels/sheet${index + 1}.xml.rels`,
        data: utf8(sheetDrawingRels(image.imageIndex)),
      });
      files.push({
        name: `xl/drawings/drawing${image.imageIndex}.xml`,
        data: utf8(drawingImageXml(image.imageIndex, lastRow, sheetSpec.image)),
      });
      files.push({
        name: `xl/drawings/_rels/drawing${image.imageIndex}.xml.rels`,
        data: utf8(drawingImageRels(image.imageIndex)),
      });
      files.push({
        name: `xl/media/image${image.imageIndex}.png`,
        data: sheetSpec.image.png,
      });
    }
  });
  return zipStore(files);
}

function uniqueSheets(input: readonly ExcelSheet[]): ExcelSheet[] {
  const used = new Set<string>();
  return input.map((sheetSpec, index) => {
    const base = sanitizeSheetName(sheetSpec.name, index);
    let name = base;
    let suffix = 2;
    while (used.has(name.toLowerCase())) {
      const extra = ` (${suffix})`;
      name = `${base.slice(0, Math.max(1, 31 - extra.length))}${extra}`;
      suffix += 1;
    }
    used.add(name.toLowerCase());
    return { ...sheetSpec, name };
  });
}

function sanitizeSheetName(value: string, index: number): string {
  const cleaned = value.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || `Hoja ${index + 1}`).slice(0, 31);
}

function contentTypes(sheetCount: number, imageCount: number): string {
  const parts = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Default Extension="png" ContentType="image/png"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
  ];
  for (let index = 1; index <= sheetCount; index += 1) {
    parts.push(
      `<Override PartName="/xl/worksheets/sheet${index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    );
  }
  for (let index = 1; index <= imageCount; index += 1) {
    parts.push(
      `<Override PartName="/xl/drawings/drawing${index}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    );
  }
  parts.push('</Types>');
  return parts.join('');
}

function packageRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function workbookXml(sheets: readonly ExcelSheet[]): string {
  const items = sheets
    .map(
      (sheetSpec, index) =>
        `<sheet name="${xml(sheetSpec.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr/>
  <sheets>${items}</sheets>
</workbook>`;
}

function workbookRels(sheetCount: number): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function styles(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/>
  </numFmts>
  <fonts count="2">
    <font>
      <sz val="11"/>
      <color rgb="FF1F2937"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FFFFFFFF"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FF0F766E"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFF4F8F7"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFD7E5E3"/></left>
      <right style="thin"><color rgb="FFD7E5E3"/></right>
      <top style="thin"><color rgb="FFD7E5E3"/></top>
      <bottom style="thin"><color rgb="FFD7E5E3"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="3" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="4" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;
}

function sheet(
  headers: readonly string[],
  rows: readonly ExcelCell[][],
  widths: readonly number[],
  lastCol: string,
  lastRow: number,
  selected: boolean,
  hasDrawing: boolean,
): string {
  const out: string[] = [];
  out.push(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`);
  out.push(
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
  );
  out.push(`<dimension ref="A1:${lastCol}${lastRow}"/>`);
  out.push(`<sheetViews><sheetView${selected ? ' tabSelected="1"' : ''} workbookViewId="0">`);
  out.push(`<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>`);
  out.push(`<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>`);
  out.push(`</sheetView></sheetViews>`);
  out.push(`<sheetFormatPr defaultRowHeight="16" defaultColWidth="14"/>`);
  out.push('<cols>');
  widths.forEach((width, index) => {
    out.push(`<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`);
  });
  out.push('</cols><sheetData>');
  out.push('<row r="1" ht="22" customHeight="1">');
  headers.forEach((header, index) => {
    out.push(inline(columnLetter(index) + '1', header, 1));
  });
  out.push('</row>');
  rows.forEach((row, rowIndex) => {
    const excelRow = rowIndex + 2;
    const zebra = excelRow % 2 === 1;
    out.push(`<row r="${excelRow}" ht="18">`);
    row.forEach((cell, index) => {
      out.push(dataCell(columnLetter(index) + excelRow, cell, zebra));
    });
    out.push('</row>');
  });
  out.push('</sheetData>');
  out.push(`<autoFilter ref="A1:${lastCol}${lastRow}"/>`);
  out.push(`<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>`);
  if (hasDrawing) {
    out.push(`<drawing r:id="rId1"/>`);
  }
  out.push('</worksheet>');
  return out.join('');
}

function sheetDrawingRels(imageIndex: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${imageIndex}.xml"/>
</Relationships>`;
}

function drawingImageRels(imageIndex: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${imageIndex}.png"/>
</Relationships>`;
}

function drawingImageXml(imageIndex: number, lastRow: number, image: ExcelImage): string {
  const cx = Math.round(image.widthPx * 9525);
  const cy = Math.round(image.heightPx * 9525);
  const shapeId = imageIndex + 1;
  const toRow = lastRow + Math.max(14, Math.round(image.heightPx / 18));
  const toCol = Math.max(8, Math.round(image.widthPx / 64));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor editAs="oneCell">
    <xdr:from>
      <xdr:col>0</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>${lastRow}</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:from>
    <xdr:to>
      <xdr:col>${toCol}</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>${toRow}</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:to>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="${shapeId}" name="Picture ${imageIndex}" descr="Widget"/>
        <xdr:cNvPicPr>
          <a:picLocks noChangeAspect="1"/>
        </xdr:cNvPicPr>
      </xdr:nvPicPr>
      <xdr:blipFill>
        <a:blip r:embed="rId1" cstate="print"/>
        <a:stretch>
          <a:fillRect/>
        </a:stretch>
      </xdr:blipFill>
      <xdr:spPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="${cx}" cy="${cy}"/>
        </a:xfrm>
        <a:prstGeom prst="rect">
          <a:avLst/>
        </a:prstGeom>
      </xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

function dataCell(ref: string, cell: ExcelCell, zebra: boolean): string {
  const style = styleOf(cell.kind, zebra);
  if (cell.kind === 'date') {
    const date = cell.value instanceof Date ? cell.value : new Date(String(cell.value));
    if (Number.isNaN(date.getTime())) {
      return inline(ref, String(cell.value), style);
    }
    return `<c r="${ref}" s="${style}" t="n"><v>${excelSerial(date)}</v></c>`;
  }
  if (cell.kind === 'integer' || cell.kind === 'money') {
    const number = typeof cell.value === 'number' ? cell.value : Number(cell.value);
    if (!Number.isFinite(number)) {
      return inline(ref, '', style);
    }
    return `<c r="${ref}" s="${style}" t="n"><v>${number}</v></c>`;
  }
  return inline(ref, String(cell.value ?? ''), style);
}

function styleOf(kind: ExcelCellKind, zebra: boolean): number {
  const odd = zebra ? 1 : 0;
  switch (kind) {
    case 'date':
      return 4 + odd;
    case 'integer':
      return 6 + odd;
    case 'money':
      return 8 + odd;
    default:
      return 2 + odd;
  }
}

function inline(ref: string, value: string, style: number): string {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
}

function excelSerial(date: Date): string {
  return String(date.getTime() / 86400000 + 25569);
}

export function columnLetter(index: number): string {
  let current = index;
  let name = '';
  while (current >= 0) {
    name = String.fromCharCode(65 + (current % 26)) + name;
    current = Math.floor(current / 26) - 1;
  }
  return name;
}

function xml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = utf8(file.name);
    const crc = crc32(file.data);
    const local = concat([
      u8(0x50, 0x4b, 0x03, 0x04),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    const central = concat([
      u8(0x50, 0x4b, 0x01, 0x02),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concat(centrals);
  const end = concat([
    u8(0x50, 0x4b, 0x05, 0x06),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, centralDir, end]);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc;
  }
  return table;
}

function u8(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
