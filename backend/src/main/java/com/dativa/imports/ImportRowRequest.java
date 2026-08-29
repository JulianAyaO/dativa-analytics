package com.dativa.imports;

import java.math.BigDecimal;
import java.time.Instant;

public record ImportRowRequest(
        Instant occurredAt,
        String region,
        String category,
        String product,
        String seller,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal amount) {}
