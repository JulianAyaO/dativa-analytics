package com.dativa.alerts;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class AlertConditionsTest {
    @Test
    void matchesThresholds() {
        assertThat(AlertConditions.matches("above", BigDecimal.TEN, 10, null)).isTrue();
        assertThat(AlertConditions.matches("above", BigDecimal.TEN, 9, null)).isFalse();
        assertThat(AlertConditions.matches("below", BigDecimal.TEN, 10, null)).isTrue();
        assertThat(AlertConditions.matches("goal", BigDecimal.valueOf(100), 120, null)).isTrue();
        assertThat(AlertConditions.matches("change_pct", BigDecimal.valueOf(8), 50, 0.1)).isTrue();
        assertThat(AlertConditions.matches("change_pct", BigDecimal.valueOf(8), 50, 0.05)).isFalse();
        assertThat(AlertConditions.matches("change_pct", BigDecimal.valueOf(8), 50, null)).isFalse();
    }

    @Test
    void recentlyFiredRespectsFrequency() {
        Instant now = Instant.parse("2026-08-24T12:00:00Z");
        assertThat(AlertConditions.recentlyFired(Instant.parse("2026-08-24T11:59:30Z"), 1, now)).isTrue();
        assertThat(AlertConditions.recentlyFired(Instant.parse("2026-08-24T10:00:00Z"), 1, now)).isFalse();
        assertThat(AlertConditions.recentlyFired(null, 1, now)).isFalse();
    }
}
