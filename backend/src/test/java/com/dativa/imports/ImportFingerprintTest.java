package com.dativa.imports;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ImportFingerprintTest {
    @Test
    void treatsEquivalentRowsAsTheSameFingerprint() {
        String left = ImportFingerprint.of(
                "sales",
                Instant.parse("2026-08-01T00:00:00.000Z"),
                "Caribe",
                "Moda",
                "Chaqueta",
                "Ana Pérez",
                2,
                new BigDecimal("10"),
                new BigDecimal("20"));
        String right = ImportFingerprint.of(
                "sales",
                Instant.parse("2026-08-01T00:00:00Z"),
                "  CARIBE ",
                "moda",
                "Chaqueta",
                "ANA PEREZ",
                2,
                new BigDecimal("10.00"),
                new BigDecimal("20.0"));

        assertThat(left).isEqualTo(right);
    }

    @Test
    void keepsDifferentAmountsDistinct() {
        String left = ImportFingerprint.of(
                "sales",
                Instant.parse("2026-08-01T00:00:00Z"),
                "Caribe",
                "Moda",
                "Chaqueta",
                "Ana Pérez",
                2,
                new BigDecimal("10"),
                new BigDecimal("20"));
        String right = ImportFingerprint.of(
                "sales",
                Instant.parse("2026-08-01T00:00:00Z"),
                "Caribe",
                "Moda",
                "Chaqueta",
                "Ana Pérez",
                2,
                new BigDecimal("10"),
                new BigDecimal("40"));

        assertThat(left).isNotEqualTo(right);
    }
}
