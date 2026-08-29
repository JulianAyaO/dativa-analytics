package com.dativa.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import com.dativa.analytics.dto.MetricBucket;
import com.dativa.analytics.dto.MetricTotals;
import com.dativa.analytics.dto.WidgetQueryRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.DashboardFiltersRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.WidgetConfigRequest;
import com.dativa.analytics.dto.WidgetResultResponse;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AnalyticsResultMapperTest {
    private final PeriodWindows periods =
            new PeriodWindows(Clock.fixed(Instant.parse("2026-08-24T12:00:00Z"), ZoneOffset.UTC));
    private final AnalyticsResultMapper mapper = new AnalyticsResultMapper();

    @Test
    void mapsEmptyTotalsToEmptyResult() {
        ResolvedQuery query = resolved("kpi", AggregationKind.SCALAR, "month");
        WidgetResultResponse result = mapper.toResult(
                query,
                MetricTotals.empty(),
                MetricTotals.empty(),
                List.of(),
                List.of(),
                List.of(),
                List.of());

        assertThat(result.status()).isEqualTo("empty");
        assertThat(result.family()).isEqualTo("kpi");
        assertThat(result.data()).isNull();
    }

    @Test
    @SuppressWarnings("unchecked")
    void mapsScalarKindToKpiContract() {
        ResolvedQuery query = resolved("kpi", AggregationKind.SCALAR, "month");
        PeriodWindows.Range range = periods.current("last_12_months");
        List<PeriodWindows.BucketKey> keys = periods.timeKeys("last_12_months", range);

        WidgetResultResponse result = mapper.toResult(
                query,
                new MetricTotals(BigDecimal.valueOf(1200), 10, 4),
                new MetricTotals(BigDecimal.valueOf(1000), 8, 3),
                List.of(new MetricBucket(keys.getFirst().key(), keys.getFirst().label(), BigDecimal.valueOf(100), 1, 1)),
                List.of(),
                keys,
                List.of());

        assertThat(result.status()).isEqualTo("ready");
        Map<String, Object> data = (Map<String, Object>) result.data();
        assertThat(data.get("family")).isEqualTo("kpi");
        assertThat(data.get("value")).isEqualTo(1200.0);
        assertThat((List<?>) ((Map<String, Object>) data.get("sparkline")).get("values")).hasSize(12);
    }

    private static ResolvedQuery resolved(String type, AggregationKind kind, String dimension) {
        WidgetQueryRequest echo = new WidgetQueryRequest(
                type,
                new WidgetConfigRequest("sales", "revenue", dimension, "last_12_months", null),
                DashboardFiltersRequest.empty());
        Instant from = Instant.parse("2025-09-01T00:00:00Z");
        Instant to = Instant.parse("2026-09-01T00:00:00Z");
        return new ResolvedQuery(
                type,
                "kpi",
                kind,
                "sales",
                "revenue",
                dimension,
                "last_12_months",
                0,
                DashboardFiltersRequest.empty(),
                from,
                to,
                Instant.parse("2024-09-01T00:00:00Z"),
                from,
                echo);
    }
}
