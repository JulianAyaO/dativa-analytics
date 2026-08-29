package com.dativa.imports;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;

final class ImportFingerprint {
    private ImportFingerprint() {}

    static String of(
            String dataset,
            Instant occurredAt,
            String region,
            String category,
            String product,
            String seller,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal amount) {
        return String.join(
                "|",
                dataset == null ? "" : dataset,
                occurredAt == null ? "" : Long.toString(occurredAt.getEpochSecond()),
                normalize(region),
                normalize(category),
                normalize(product),
                normalize(seller),
                Integer.toString(quantity),
                money(unitPrice),
                money(amount));
    }

    static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String nfd = Normalizer.normalize(value.trim(), Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static String money(BigDecimal value) {
        BigDecimal amount = value == null ? BigDecimal.ZERO : value;
        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
