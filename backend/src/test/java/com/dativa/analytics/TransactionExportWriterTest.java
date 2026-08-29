package com.dativa.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import com.dativa.analytics.dto.TransactionRow;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.Test;

class TransactionExportWriterTest {
    private final TransactionRow row = new TransactionRow(
            UUID.fromString("00000000-0000-0000-0000-000000000001"),
            "sales",
            Instant.parse("2026-08-20T09:00:00Z"),
            "Caribe",
            "Electrónica",
            "Auriculares",
            "Ana Pérez",
            2,
            new BigDecimal("12.5"),
            new BigDecimal("25"));

    @Test
    void csvUsesBomSemicolonAndUtf8() {
        byte[] csv = TransactionExportWriter.csv(List.of(row), List.of("seller", "amount"));
        String text = new String(csv, StandardCharsets.UTF_8);

        assertThat(text).startsWith("\uFEFF");
        assertThat(text).contains("Vendedor;Importe");
        assertThat(text).contains("Ana Pérez");
        assertThat(text).contains("25");
    }

    @Test
    void excelIsARealXlsxZip() throws Exception {
        byte[] xlsx = TransactionExportWriter.excel(List.of(row), List.of("product", "amount"));

        assertThat(xlsx[0]).isEqualTo((byte) 0x50);
        assertThat(xlsx[1]).isEqualTo((byte) 0x4b);

        String sheetXml = "";
        String stylesXml = "";
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(xlsx))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if ("xl/worksheets/sheet1.xml".equals(entry.getName())) {
                    sheetXml = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                }
                if ("xl/styles.xml".equals(entry.getName())) {
                    stylesXml = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
        }

        assertThat(sheetXml).contains("Auriculares");
        assertThat(sheetXml).contains("<v>25</v>");
        assertThat(sheetXml).contains("inlineStr");
        assertThat(sheetXml).contains("state=\"frozen\"");
        assertThat(sheetXml).contains("autoFilter");
        assertThat(stylesXml).contains("FF0F766E");
    }
}
