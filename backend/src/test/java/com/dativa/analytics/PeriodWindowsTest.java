package com.dativa.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class PeriodWindowsTest {
    private final PeriodWindows periods =
            new PeriodWindows(Clock.fixed(Instant.parse("2026-08-24T12:00:00Z"), ZoneOffset.UTC));

    @Test
    void buildsTwelveMonthlyBucketsAndSevenDailyBuckets() {
        var months = periods.timeKeys("last_12_months", periods.current("last_12_months"));
        var days = periods.timeKeys("last_7_days", periods.current("last_7_days"));

        assertThat(months).hasSize(12);
        assertThat(months.getFirst().key()).isEqualTo("2025-09");
        assertThat(months.getLast().key()).isEqualTo("2026-08");
        assertThat(days).hasSize(7);
        assertThat(days.getLast().key()).isEqualTo("2026-08-24");
    }
}
