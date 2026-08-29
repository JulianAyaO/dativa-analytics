package com.dativa.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.dativa.analytics.dto.WidgetQueryRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.DashboardFiltersRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.WidgetConfigRequest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AnalyticsQueryValidatorTest {
    private AnalyticsQueryValidator validator;

    @BeforeEach
    void setUp() {
        validator = new AnalyticsQueryValidator(
                new PeriodWindows(Clock.fixed(Instant.parse("2026-08-24T12:00:00Z"), ZoneOffset.UTC)));
    }

    @Test
    void resolvesRankingDefaultsAndGlobalPeriod() {
        ResolvedQuery query = validator.resolve(new WidgetQueryRequest(
                "ranking",
                new WidgetConfigRequest("sales", "revenue", null, "last_12_months", null),
                new DashboardFiltersRequest("last_30_days", "Caribe", "", "", "")));

        assertThat(query.family()).isEqualTo("ranking");
        assertThat(query.kind()).isEqualTo(AggregationKind.RANKING);
        assertThat(query.dimension()).isEqualTo("seller");
        assertThat(query.topN()).isEqualTo(5);
        assertThat(query.period()).isEqualTo("last_30_days");
        assertThat(query.filters().region()).isEqualTo("Caribe");
    }

    @Test
    void rejectsTopNOutsideRanking() {
        assertThatThrownBy(() -> validator.resolve(new WidgetQueryRequest(
                        "kpi",
                        new WidgetConfigRequest("sales", "revenue", null, "last_12_months", 5),
                        DashboardFiltersRequest.empty())))
                .isInstanceOf(InvalidAnalyticsQueryException.class)
                .hasMessageContaining("topN");
    }

    @Test
    void acceptsSeveralKnownFilterValues() {
        ResolvedQuery query = validator.resolve(new WidgetQueryRequest(
                "bar",
                new WidgetConfigRequest("sales", "revenue", "region", "last_12_months", null),
                new DashboardFiltersRequest("", "Caribe, Andina", "", "", "")));

        assertThat(query.filters().region()).isEqualTo("Caribe,Andina");
    }

    @Test
    void rejectsUnknownFilterValues() {
        assertThatThrownBy(() -> validator.resolve(new WidgetQueryRequest(
                        "bar",
                        new WidgetConfigRequest("sales", "revenue", "region", "last_12_months", null),
                        new DashboardFiltersRequest("", "Atlántico", "", "", ""))))
                .isInstanceOf(InvalidAnalyticsQueryException.class)
                .hasMessageContaining("región");
    }

    @Test
    void resolvesTransactionListSortAndSearch() {
        TransactionListQuery query = validator.resolveList(
                "sales", "last_12_months", "Caribe", "", "", "", "Ana", "amount", "asc", 0, 50);

        assertThat(query.search()).isEqualTo("Ana");
        assertThat(query.sort()).isEqualTo(TransactionSort.AMOUNT);
        assertThat(query.direction()).isEqualTo("ASC");
        assertThat(query.resolved().filters().region()).isEqualTo("Caribe");
    }

    @Test
    void rejectsUnknownTransactionSort() {
        assertThatThrownBy(() -> validator.resolveList(
                        "sales", "last_12_months", "", "", "", "", "", "revenue", "desc", 0, 50))
                .isInstanceOf(InvalidAnalyticsQueryException.class)
                .hasMessageContaining("Ordenación");
    }
}
