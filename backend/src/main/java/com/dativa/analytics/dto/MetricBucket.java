package com.dativa.analytics.dto;

import java.math.BigDecimal;

public record MetricBucket(
        String key, String label, BigDecimal revenue, long units, long orders) {

    public static MetricBucket zero(String key, String label) {
        return new MetricBucket(key, label, BigDecimal.ZERO, 0, 0);
    }
}
