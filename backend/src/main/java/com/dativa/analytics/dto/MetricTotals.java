package com.dativa.analytics.dto;

import java.math.BigDecimal;

public record MetricTotals(BigDecimal revenue, long units, long orders) {
    public static MetricTotals empty() {
        return new MetricTotals(BigDecimal.ZERO, 0, 0);
    }

    public boolean isEmpty() {
        return revenue.signum() <= 0 && units <= 0 && orders <= 0;
    }
}
