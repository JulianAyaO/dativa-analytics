package com.dativa.alerts;

import java.math.BigDecimal;

final class AlertConditions {
    private AlertConditions() {}

    static boolean matches(String condition, BigDecimal threshold, double value, Double changePct) {
        double limit = threshold == null ? 0 : threshold.doubleValue();
        return switch (condition) {
            case "above", "goal" -> value >= limit;
            case "below" -> value <= limit;
            case "change_pct" -> changePct != null && Math.abs(changePct * 100) >= limit;
            default -> false;
        };
    }

    static boolean recentlyFired(java.time.Instant lastFiredAt, int frequencyMinutes, java.time.Instant now) {
        if (lastFiredAt == null) {
            return false;
        }
        long minutes = Math.max(frequencyMinutes, 1);
        return lastFiredAt.plusSeconds(minutes * 60L).isAfter(now);
    }
}
