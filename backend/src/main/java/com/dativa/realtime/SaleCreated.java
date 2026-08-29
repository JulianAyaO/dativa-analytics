package com.dativa.realtime;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SaleCreated(
        String type,
        UUID id,
        String dataset,
        Instant occurredAt,
        String region,
        String category,
        String product,
        String seller,
        int quantity,
        BigDecimal amount) {
    public static final String TYPE = "SaleCreated";

    public static SaleCreated of(
            String dataset,
            Instant occurredAt,
            String region,
            String category,
            String product,
            String seller,
            int quantity,
            BigDecimal amount) {
        return new SaleCreated(
                TYPE,
                UUID.randomUUID(),
                dataset,
                occurredAt,
                region,
                category,
                product,
                seller,
                quantity,
                amount);
    }
}
