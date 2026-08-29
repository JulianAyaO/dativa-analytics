package com.dativa.analytics;

import com.dativa.analytics.InvalidAnalyticsQueryException;
import java.util.Arrays;

public enum TransactionSort {
    OCCURRED_AT("occurredAt", "o.ordered_at"),
    AMOUNT("amount", "l.amount"),
    PRODUCT("product", "p.name"),
    REGION("region", "r.name"),
    CATEGORY("category", "c.name"),
    SELLER("seller", "s.name"),
    QUANTITY("quantity", "l.quantity"),
    UNIT_PRICE("unitPrice", "l.unit_price");

    private final String api;
    private final String sql;

    TransactionSort(String api, String sql) {
        this.api = api;
        this.sql = sql;
    }

    public String api() {
        return api;
    }

    public String sql() {
        return sql;
    }

    public static TransactionSort from(String raw) {
        if (raw == null || raw.isBlank()) {
            return OCCURRED_AT;
        }

        return Arrays.stream(values())
                .filter(item -> item.api.equals(raw))
                .findFirst()
                .orElseThrow(() -> new InvalidAnalyticsQueryException("Ordenación no soportada"));
    }
}
