package com.dativa.analytics;

import com.dativa.analytics.dto.TransactionRow;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

final class TransactionExportWriter {
    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneOffset.UTC);
    private static final String XLSX_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static final String REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
    private static final String OFFICE_REL_NS =
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static final Map<String, Double> WIDTHS = Map.of(
            "occurredAt", 20.0,
            "dataset", 12.0,
            "region", 16.0,
            "category", 16.0,
            "product", 24.0,
            "seller", 18.0,
            "quantity", 12.0,
            "unitPrice", 14.0,
            "amount", 14.0);

    private static final Map<String, String> HEADERS = Map.of(
            "occurredAt", "Fecha",
            "dataset", "Fuente",
            "region", "Región",
            "category", "Categoría",
            "product", "Producto",
            "seller", "Vendedor",
            "quantity", "Unidades",
            "unitPrice", "Precio",
            "amount", "Importe");

    static final List<String> DEFAULT_COLUMNS = List.of(
            "occurredAt",
            "dataset",
            "region",
            "category",
            "product",
            "seller",
            "quantity",
            "unitPrice",
            "amount");

    static List<String> columns(List<String> requested) {
        if (requested == null || requested.isEmpty()) {
            return DEFAULT_COLUMNS;
        }

        List<String> selected = requested.stream().filter(DEFAULT_COLUMNS::contains).distinct().toList();
        return selected.isEmpty() ? DEFAULT_COLUMNS : selected;
    }

    static byte[] csv(List<TransactionRow> rows, List<String> columns) {
        StringBuilder out = new StringBuilder("\uFEFF");
        out.append(String.join(";", columns.stream().map(TransactionExportWriter::header).toList()));
        out.append("\r\n");
        for (TransactionRow row : rows) {
            out.append(String.join(";", columns.stream().map(column -> csvCell(value(row, column))).toList()));
            out.append("\r\n");
        }
        return out.toString().getBytes(StandardCharsets.UTF_8);
    }

    static byte[] excel(List<TransactionRow> rows, List<String> columns) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
                put(zip, "[Content_Types].xml", contentTypes());
                put(zip, "_rels/.rels", packageRels());
                put(zip, "xl/workbook.xml", workbook());
                put(zip, "xl/_rels/workbook.xml.rels", workbookRels());
                put(zip, "xl/styles.xml", styles());
                put(zip, "xl/worksheets/sheet1.xml", sheet(rows, columns));
            }
            return bytes.toByteArray();
        } catch (IOException error) {
            throw new UncheckedIOException("No se pudo generar el Excel", error);
        }
    }

    private static void put(ZipOutputStream zip, String name, String xml) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(xml.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private static String contentTypes() {
        return """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                </Types>
                """;
    }

    private static String packageRels() {
        return """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="%s">
                  <Relationship Id="rId1" Type="%s/officeDocument" Target="xl/workbook.xml"/>
                </Relationships>
                """
                .formatted(REL_NS, OFFICE_REL_NS);
    }

    private static String workbook() {
        return """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <workbook xmlns="%s" xmlns:r="%s">
                  <sheets>
                    <sheet name="Transacciones" sheetId="1" r:id="rId1"/>
                  </sheets>
                </workbook>
                """
                .formatted(XLSX_NS, OFFICE_REL_NS);
    }

    private static String workbookRels() {
        return """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="%s">
                  <Relationship Id="rId1" Type="%s/worksheet" Target="worksheets/sheet1.xml"/>
                  <Relationship Id="rId2" Type="%s/styles" Target="styles.xml"/>
                </Relationships>
                """
                .formatted(REL_NS, OFFICE_REL_NS, OFFICE_REL_NS);
    }

    private static String styles() {
        return """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <styleSheet xmlns="%s">
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
                </styleSheet>
                """
                .formatted(XLSX_NS);
    }

    private static String sheet(List<TransactionRow> rows, List<String> columns) {
        String lastCol = columnLetter(Math.max(columns.size(), 1) - 1);
        int lastRow = Math.max(rows.size() + 1, 1);
        StringBuilder out = new StringBuilder();
        out.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>");
        out.append("<worksheet xmlns=\"").append(XLSX_NS).append("\">");
        out.append("<dimension ref=\"A1:").append(lastCol).append(lastRow).append("\"/>");
        out.append("<sheetViews><sheetView tabSelected=\"1\" workbookViewId=\"0\">");
        out.append("<pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/>");
        out.append("<selection pane=\"bottomLeft\" activeCell=\"A2\" sqref=\"A2\"/>");
        out.append("</sheetView></sheetViews>");
        out.append("<sheetFormatPr defaultRowHeight=\"16\" defaultColWidth=\"14\"/>");
        out.append("<cols>");
        for (int index = 0; index < columns.size(); index += 1) {
            double width = WIDTHS.getOrDefault(columns.get(index), 14.0);
            out.append("<col min=\"")
                    .append(index + 1)
                    .append("\" max=\"")
                    .append(index + 1)
                    .append("\" width=\"")
                    .append(width)
                    .append("\" customWidth=\"1\"/>");
        }
        out.append("</cols><sheetData>");
        out.append("<row r=\"1\" ht=\"22\" customHeight=\"1\">");
        for (int index = 0; index < columns.size(); index += 1) {
            out.append(inline(columnLetter(index) + "1", header(columns.get(index)), 1));
        }
        out.append("</row>");
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex += 1) {
            TransactionRow row = rows.get(rowIndex);
            int excelRow = rowIndex + 2;
            boolean zebra = excelRow % 2 == 1;
            out.append("<row r=\"").append(excelRow).append("\" ht=\"18\">");
            for (int index = 0; index < columns.size(); index += 1) {
                String ref = columnLetter(index) + excelRow;
                out.append(styledCell(ref, cell(row, columns.get(index)), zebra));
            }
            out.append("</row>");
        }
        out.append("</sheetData>");
        out.append("<autoFilter ref=\"A1:").append(lastCol).append(lastRow).append("\"/>");
        out.append("<pageMargins left=\"0.5\" right=\"0.5\" top=\"0.75\" bottom=\"0.75\" header=\"0.3\" footer=\"0.3\"/>");
        out.append("</worksheet>");
        return out.toString();
    }

    private static String styledCell(String ref, Cell cell, boolean zebra) {
        int style = styleOf(cell.kind(), zebra);
        if (cell.kind() == CellKind.DATE) {
            return "<c r=\"" + ref + "\" s=\"" + style + "\" t=\"n\"><v>" + xml(cell.value()) + "</v></c>";
        }
        if (cell.kind() == CellKind.INTEGER || cell.kind() == CellKind.MONEY) {
            return "<c r=\"" + ref + "\" s=\"" + style + "\" t=\"n\"><v>" + xml(cell.value()) + "</v></c>";
        }
        return inline(ref, cell.value(), style);
    }

    private static int styleOf(CellKind kind, boolean zebra) {
        int odd = zebra ? 1 : 0;
        return switch (kind) {
            case DATE -> 4 + odd;
            case INTEGER -> 6 + odd;
            case MONEY -> 8 + odd;
            case TEXT -> 2 + odd;
        };
    }

    private static String inline(String ref, String value, int style) {
        return "<c r=\"" + ref + "\" s=\"" + style + "\" t=\"inlineStr\"><is><t>" + xml(value) + "</t></is></c>";
    }

    private static String columnLetter(int index) {
        StringBuilder name = new StringBuilder();
        int current = index;
        while (current >= 0) {
            name.insert(0, (char) ('A' + current % 26));
            current = current / 26 - 1;
        }
        return name.toString();
    }

    private static String header(String column) {
        return HEADERS.getOrDefault(column, column);
    }

    private static String csvCell(String value) {
        if (value.indexOf(';') >= 0 || value.indexOf('"') >= 0 || value.indexOf('\n') >= 0) {
            return '"' + value.replace("\"", "\"\"") + '"';
        }
        return value;
    }

    private static String xml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String value(TransactionRow row, String column) {
        Cell cell = cell(row, column);
        if (column.equals("occurredAt")) {
            return DATE.format(row.occurredAt());
        }
        return cell.kind() == CellKind.DATE ? DATE.format(row.occurredAt()) : cell.value();
    }

    private static Cell cell(TransactionRow row, String column) {
        return switch (column) {
            case "occurredAt" -> new Cell(CellKind.DATE, excelSerial(row.occurredAt()));
            case "dataset" -> new Cell(CellKind.TEXT, datasetLabel(row.dataset()));
            case "region" -> new Cell(CellKind.TEXT, row.region());
            case "category" -> new Cell(CellKind.TEXT, row.category());
            case "product" -> new Cell(CellKind.TEXT, row.product());
            case "seller" -> new Cell(CellKind.TEXT, row.seller());
            case "quantity" -> new Cell(CellKind.INTEGER, Integer.toString(row.quantity()));
            case "unitPrice" -> new Cell(CellKind.MONEY, decimal(row.unitPrice()));
            case "amount" -> new Cell(CellKind.MONEY, decimal(row.amount()));
            default -> new Cell(CellKind.TEXT, "");
        };
    }

    private static String excelSerial(Instant instant) {
        return Double.toString(instant.toEpochMilli() / 86400000.0 + 25569.0);
    }

    private static String datasetLabel(String dataset) {
        return "orders".equals(dataset) ? "Pedidos" : "Ventas";
    }

    private static String decimal(BigDecimal value) {
        return value == null ? "0" : value.toPlainString();
    }

    private enum CellKind {
        TEXT,
        DATE,
        INTEGER,
        MONEY
    }

    private record Cell(CellKind kind, String value) {}
}
