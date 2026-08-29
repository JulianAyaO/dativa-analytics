package com.dativa.analytics.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionRow(
        UUID id,
        String dataset,
        Instant occurredAt,
        String region,
        String category,
        String product,
        String seller,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal amount) {}
