package com.dativa.analytics;

import com.dativa.analytics.dto.WidgetQueryRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.DashboardFiltersRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.WidgetConfigRequest;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class AnalyticsQueryValidator {
    private final PeriodWindows periods;

    public AnalyticsQueryValidator(PeriodWindows periods) {
        this.periods = periods;
    }

    public ResolvedQuery resolve(WidgetQueryRequest request) {
        if (request == null || request.config() == null) {
            throw new InvalidAnalyticsQueryException("La consulta analítica es obligatoria");
        }

        String type = required(request.type(), "tipo").toLowerCase(Locale.ROOT);
        if (!ResolvedQuery.TYPES.contains(type)) {
            throw new InvalidAnalyticsQueryException("Tipo de widget no soportado");
        }

        WidgetConfigRequest config = request.config();
        String dataset = required(config.dataset(), "fuente").toLowerCase(Locale.ROOT);
        if (!ResolvedQuery.DATASETS.contains(dataset)) {
            throw new InvalidAnalyticsQueryException("Fuente de datos no soportada");
        }

        String metric = required(config.metric(), "métrica").toLowerCase(Locale.ROOT);
        if (!ResolvedQuery.METRICS.contains(metric)) {
            throw new InvalidAnalyticsQueryException("Métrica no soportada");
        }

        String family = ResolvedQuery.FAMILY_BY_TYPE.get(type);
        AggregationKind kind = ResolvedQuery.KIND_BY_FAMILY.get(family);
        DashboardFiltersRequest filters =
                (request.filters() == null ? DashboardFiltersRequest.empty() : request.filters()).normalized();

        String period = firstNonBlank(filters.period(), config.period(), "last_12_months");
        if (!ResolvedQuery.PERIODS.contains(period)) {
            throw new InvalidAnalyticsQueryException("Periodo no soportado");
        }

        String dimension = resolveDimension(type, family, config.dimension());
        int topN = resolveTopN(family, config.topN());
        validateFilters(filters);

        PeriodWindows.Range current = periods.current(period);
        PeriodWindows.Range previous = periods.previous(current);

        WidgetQueryRequest echo = new WidgetQueryRequest(
                type,
                new WidgetConfigRequest(dataset, metric, dimension, config.period() == null || config.period().isBlank()
                        ? period
                        : config.period(), family.equals("ranking") ? topN : null),
                filters);

        return new ResolvedQuery(
                type,
                family,
                kind,
                dataset,
                metric,
                dimension,
                period,
                topN,
                filters,
                current.fromInclusive(),
                current.toExclusive(),
                previous.fromInclusive(),
                previous.toExclusive(),
                echo);
    }

    public TransactionListQuery resolveList(
            String dataset,
            String period,
            String region,
            String category,
            String product,
            String seller,
            String search,
            String sort,
            String direction,
            int page,
            int size) {
        return resolveList(dataset, period, region, category, product, seller, search, sort, direction, page, size, 100);
    }

    public TransactionListQuery resolveExport(
            String dataset,
            String period,
            String region,
            String category,
            String product,
            String seller,
            String search,
            String sort,
            String direction) {
        return resolveList(
                dataset, period, region, category, product, seller, search, sort, direction, 0, 5_000, 5_000);
    }

    public TransactionListQuery resolveList(
            String dataset,
            String period,
            String region,
            String category,
            String product,
            String seller,
            String search,
            String sort,
            String direction,
            int page,
            int size,
            int maxSize) {
        if (page < 0) {
            throw new InvalidAnalyticsQueryException("La página no puede ser negativa");
        }
        if (size < 1 || size > maxSize) {
            throw new InvalidAnalyticsQueryException("El tamaño de página no es válido");
        }

        WidgetQueryRequest request = new WidgetQueryRequest(
                "table",
                new WidgetConfigRequest(dataset, "revenue", "month", period, null),
                new DashboardFiltersRequest(period, region, category, product, seller));

        return new TransactionListQuery(
                resolve(request),
                normalizeSearch(search),
                TransactionSort.from(sort),
                "asc".equalsIgnoreCase(direction) ? "ASC" : "DESC",
                page,
                size);
    }

    static String normalizeSearch(String search) {
        if (search == null) {
            return "";
        }

        String value = search.trim();
        if (value.length() > 80) {
            throw new InvalidAnalyticsQueryException("La búsqueda es demasiado larga");
        }

        return value.replace("%", "").replace("_", "");
    }

    private static String resolveDimension(String type, String family, String raw) {
        String dimension = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (family.equals("kpi") || family.equals("progress")) {
            if (!dimension.isEmpty() && !ResolvedQuery.DIMENSIONS.contains(dimension)) {
                throw new InvalidAnalyticsQueryException("Dimensión no soportada");
            }
            return dimension.isEmpty() ? "month" : dimension;
        }

        if (dimension.isEmpty()) {
            dimension = defaultDimension(type);
        }
        if (!ResolvedQuery.DIMENSIONS.contains(dimension)) {
            throw new InvalidAnalyticsQueryException("Dimensión no soportada");
        }
        return dimension;
    }

    private static String defaultDimension(String type) {
        return switch (type) {
            case "line", "bar", "area" -> "month";
            case "ranking" -> "seller";
            default -> "category";
        };
    }

    private static int resolveTopN(String family, Integer topN) {
        if (!family.equals("ranking")) {
            if (topN != null) {
                throw new InvalidAnalyticsQueryException("topN solo aplica a widgets de ranking");
            }
            return 0;
        }

        int value = topN == null ? 5 : topN;
        if (!ResolvedQuery.TOP_N.contains(value)) {
            throw new InvalidAnalyticsQueryException("topN debe ser 3, 5 o 10");
        }
        return value;
    }

    private static void validateFilters(DashboardFiltersRequest filters) {
        if (!filters.period().isEmpty() && !ResolvedQuery.PERIODS.contains(filters.period())) {
            throw new InvalidAnalyticsQueryException("El filtro de fecha no es válido");
        }
        requireKnown("región", filters.region(), ResolvedQuery.REGIONS);
        requireKnown("categoría", filters.category(), ResolvedQuery.CATEGORIES);
        requireKnown("producto", filters.product(), ResolvedQuery.PRODUCTS);
        requireKnown("vendedor", filters.seller(), ResolvedQuery.SELLERS);
    }

    private static void requireKnown(String field, String value, Set<String> allowed) {
        if (value.isEmpty()) {
            return;
        }
        for (String part : value.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty() && !allowed.contains(trimmed)) {
                throw new InvalidAnalyticsQueryException("El filtro de " + field + " no es válido");
            }
        }
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new InvalidAnalyticsQueryException("El campo " + field + " es obligatorio");
        }
        return value.trim();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }
}
