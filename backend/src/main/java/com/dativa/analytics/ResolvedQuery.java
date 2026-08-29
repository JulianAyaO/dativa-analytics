package com.dativa.analytics;

import com.dativa.analytics.dto.WidgetQueryRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.DashboardFiltersRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.WidgetConfigRequest;
import java.time.Instant;
import java.util.Map;
import java.util.Set;

public record ResolvedQuery(
        String type,
        String family,
        AggregationKind kind,
        String dataset,
        String metric,
        String dimension,
        String period,
        int topN,
        DashboardFiltersRequest filters,
        Instant fromInclusive,
        Instant toExclusive,
        Instant previousFrom,
        Instant previousTo,
        WidgetQueryRequest echo) {

    static final Set<String> TYPES =
            Set.of("kpi", "line", "bar", "area", "pie", "table", "ranking", "progress");
    static final Set<String> DATASETS = Set.of("sales", "orders");
    static final Set<String> METRICS = Set.of("revenue", "units", "orders", "avg_ticket");
    static final Set<String> DIMENSIONS = Set.of("month", "region", "category", "product", "seller");
    static final Set<String> PERIODS = Set.of("last_7_days", "last_30_days", "last_12_months");
    static final Set<Integer> TOP_N = Set.of(3, 5, 10);

    static final Map<String, String> FAMILY_BY_TYPE = Map.of(
            "kpi", "kpi",
            "line", "series",
            "bar", "series",
            "area", "series",
            "pie", "composition",
            "table", "table",
            "ranking", "ranking",
            "progress", "progress");

    static final Map<String, AggregationKind> KIND_BY_FAMILY = Map.of(
            "kpi", AggregationKind.SCALAR,
            "series", AggregationKind.SERIES,
            "composition", AggregationKind.CATEGORIES,
            "table", AggregationKind.TABLE,
            "ranking", AggregationKind.RANKING,
            "progress", AggregationKind.PROGRESS);

    static final Set<String> REGIONS = Set.of("Caribe", "Andina", "Pacífica", "Orinoquía", "Amazonía");
    static final Set<String> CATEGORIES =
            Set.of("Electrónica", "Hogar", "Moda", "Alimentos", "Accesorios");
    static final Set<String> PRODUCTS = Set.of(
            "Monitor 27\"",
            "Portátil 14\"",
            "Auriculares",
            "Sofá 3 plazas",
            "Lámpara LED",
            "Chaqueta",
            "Zapatillas",
            "Café premium",
            "Aceite de oliva",
            "Mochila urbana");
    static final Set<String> SELLERS =
            Set.of("Ana Pérez", "Carlos Ruiz", "Lucía Gómez", "Diego Soto", "Marta Vidal", "Jorge Núñez");

    public boolean usesTimeDimension() {
        return "month".equals(dimension);
    }

    public boolean isDaily() {
        return "last_7_days".equals(period) || "last_30_days".equals(period);
    }

    public WidgetConfigRequest config() {
        return echo.config();
    }
}
