package com.dativa.analytics;

import com.dativa.analytics.dto.MetricBucket;
import com.dativa.analytics.dto.MetricTotals;
import com.dativa.analytics.dto.WidgetResultResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AnalyticsResultMapper {
    private static final Map<String, String> METRIC_LABELS = Map.of(
            "revenue", "Ingresos",
            "units", "Unidades",
            "orders", "Pedidos",
            "avg_ticket", "Ticket promedio");

    private static final Map<String, String> DIMENSION_LABELS = Map.of(
            "month", "Mes",
            "region", "Región",
            "category", "Categoría",
            "product", "Producto",
            "seller", "Vendedor");

    public WidgetResultResponse toResult(
            ResolvedQuery query,
            MetricTotals current,
            MetricTotals previous,
            List<MetricBucket> currentBuckets,
            List<MetricBucket> previousBuckets,
            List<PeriodWindows.BucketKey> timeKeys,
            List<PeriodWindows.BucketKey> previousTimeKeys) {
        if (current.isEmpty()) {
            return WidgetResultResponse.empty(query.echo(), query.family());
        }

        List<MetricBucket> labeledCurrent = relabel(query, currentBuckets, timeKeys);
        List<MetricBucket> labeledPrevious = relabel(query, previousBuckets, previousTimeKeys);

        Object data =
                switch (query.kind()) {
                    case SCALAR -> kpi(query, current, previous, timeKeys, labeledCurrent);
                    case SERIES -> series(query, timeKeys, previousTimeKeys, labeledCurrent, labeledPrevious);
                    case CATEGORIES -> composition(query, labeledCurrent);
                    case TABLE -> table(query, labeledCurrent);
                    case RANKING -> ranking(query, labeledCurrent);
                    case PROGRESS -> progress(query, current, previous);
                };

        return WidgetResultResponse.ready(query.echo(), query.family(), data);
    }

    private Map<String, Object> kpi(
            ResolvedQuery query,
            MetricTotals current,
            MetricTotals previous,
            List<PeriodWindows.BucketKey> timeKeys,
            List<MetricBucket> sparkline) {
        double value = metric(current, query.metric());
        double previousValue = metric(previous, query.metric());
        List<Map<String, String>> categories = new ArrayList<>();
        List<Double> values = new ArrayList<>();
        Map<String, MetricBucket> byKey = index(sparkline);
        for (PeriodWindows.BucketKey key : timeKeys) {
            categories.add(category(key.key(), key.label()));
            values.add(metric(byKey.getOrDefault(key.key(), MetricBucket.zero(key.key(), key.label())), query.metric()));
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("family", "kpi");
        data.put("value", round(value, query.metric()));
        data.put("previous", round(previousValue, query.metric()));
        data.put("changePct", previousValue == 0 ? null : (value - previousValue) / previousValue);
        data.put("sparkline", Map.of("categories", categories, "values", values));
        return data;
    }

    private Map<String, Object> series(
            ResolvedQuery query,
            List<PeriodWindows.BucketKey> timeKeys,
            List<PeriodWindows.BucketKey> previousTimeKeys,
            List<MetricBucket> currentBuckets,
            List<MetricBucket> previousBuckets) {
        List<Map<String, String>> categories = new ArrayList<>();
        List<Double> currentValues = new ArrayList<>();
        List<Double> previousValues = new ArrayList<>();

        if (query.usesTimeDimension()) {
            Map<String, MetricBucket> currentByKey = index(currentBuckets);
            Map<String, MetricBucket> previousByKey = index(previousBuckets);
            for (int index = 0; index < timeKeys.size(); index += 1) {
                PeriodWindows.BucketKey key = timeKeys.get(index);
                categories.add(category(key.key(), key.label()));
                currentValues.add(metric(
                        currentByKey.getOrDefault(key.key(), MetricBucket.zero(key.key(), key.label())),
                        query.metric()));
                PeriodWindows.BucketKey previousKey = index < previousTimeKeys.size()
                        ? previousTimeKeys.get(index)
                        : key;
                previousValues.add(metric(
                        previousByKey.getOrDefault(
                                previousKey.key(), MetricBucket.zero(previousKey.key(), previousKey.label())),
                        query.metric()));
            }
        } else {
            List<MetricBucket> ordered = sortedByLabel(currentBuckets);
            Map<String, MetricBucket> previousByKey = index(previousBuckets);
            for (MetricBucket bucket : ordered) {
                categories.add(category(bucket.key(), bucket.label()));
                currentValues.add(metric(bucket, query.metric()));
                previousValues.add(metric(
                        previousByKey.getOrDefault(bucket.key(), MetricBucket.zero(bucket.key(), bucket.label())),
                        query.metric()));
            }
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("family", "series");
        data.put("variant", seriesVariant(query.type()));
        data.put("categories", categories);
        data.put(
                "series",
                List.of(
                        Map.of("id", "current", "label", "Periodo actual", "values", currentValues),
                        Map.of("id", "previous", "label", "Periodo anterior", "values", previousValues)));
        return data;
    }

    private Map<String, Object> composition(ResolvedQuery query, List<MetricBucket> buckets) {
        List<Map<String, Object>> ranked = ranked(query, buckets, Integer.MAX_VALUE);
        double total = ranked.stream().mapToDouble(row -> ((Number) row.get("value")).doubleValue()).sum();
        List<Map<String, Object>> slices = ranked.stream()
                .map(row -> {
                    Map<String, Object> slice = new LinkedHashMap<>();
                    slice.put("key", row.get("key"));
                    slice.put("label", row.get("label"));
                    slice.put("value", row.get("value"));
                    return slice;
                })
                .toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("family", "composition");
        data.put("slices", slices);
        data.put("total", round(total, query.metric()));
        return data;
    }

    private Map<String, Object> table(ResolvedQuery query, List<MetricBucket> buckets) {
        List<Map<String, Object>> rows = ranked(query, buckets, Integer.MAX_VALUE);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("family", "table");
        data.put("dimensionLabel", DIMENSION_LABELS.getOrDefault(query.dimension(), query.dimension()));
        data.put("metricLabel", METRIC_LABELS.getOrDefault(query.metric(), query.metric()));
        data.put("rows", rows);
        return data;
    }

    private Map<String, Object> ranking(ResolvedQuery query, List<MetricBucket> buckets) {
        List<Map<String, Object>> ranked = ranked(query, buckets, query.topN());
        List<Map<String, Object>> items = new ArrayList<>();
        for (int index = 0; index < ranked.size(); index += 1) {
            Map<String, Object> row = ranked.get(index);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("rank", index + 1);
            item.put("key", row.get("key"));
            item.put("label", row.get("label"));
            item.put("value", row.get("value"));
            item.put("share", row.get("share"));
            items.add(item);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("family", "ranking");
        data.put("items", items);
        return data;
    }

    private Map<String, Object> progress(ResolvedQuery query, MetricTotals current, MetricTotals previous) {
        double value = metric(current, query.metric());
        double previousValue = metric(previous, query.metric());
        double target = niceTarget(previousValue);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("family", "progress");
        data.put("value", round(value, query.metric()));
        data.put("target", target);
        data.put("ratio", target == 0 ? 0 : value / target);
        return data;
    }

    private List<Map<String, Object>> ranked(ResolvedQuery query, List<MetricBucket> buckets, int limit) {
        double total = buckets.stream().mapToDouble(bucket -> metric(bucket, query.metric())).sum();
        return buckets.stream()
                .map(bucket -> {
                    double value = metric(bucket, query.metric());
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("key", bucket.key());
                    row.put("label", bucket.label());
                    row.put("value", round(value, query.metric()));
                    row.put("share", total == 0 ? 0 : value / total);
                    return row;
                })
                .sorted(Comparator.comparingDouble((Map<String, Object> row) -> ((Number) row.get("value")).doubleValue())
                        .reversed())
                .limit(limit)
                .toList();
    }

    private static List<MetricBucket> relabel(
            ResolvedQuery query, List<MetricBucket> buckets, List<PeriodWindows.BucketKey> timeKeys) {
        if (!query.usesTimeDimension() || timeKeys.isEmpty()) {
            return buckets;
        }

        Map<String, String> labels = new HashMap<>();
        for (PeriodWindows.BucketKey key : timeKeys) {
            labels.put(key.key(), key.label());
        }

        return buckets.stream()
                .map(bucket -> new MetricBucket(
                        bucket.key(),
                        labels.getOrDefault(bucket.key(), bucket.label()),
                        bucket.revenue(),
                        bucket.units(),
                        bucket.orders()))
                .toList();
    }

    private static List<MetricBucket> sortedByLabel(List<MetricBucket> buckets) {
        return buckets.stream().sorted(Comparator.comparing(MetricBucket::label)).toList();
    }

    private static Map<String, MetricBucket> index(List<MetricBucket> buckets) {
        Map<String, MetricBucket> indexed = new HashMap<>();
        for (MetricBucket bucket : buckets) {
            indexed.put(bucket.key(), bucket);
        }
        return indexed;
    }

    private static Map<String, String> category(String key, String label) {
        Map<String, String> category = new LinkedHashMap<>();
        category.put("key", key);
        category.put("label", label);
        return category;
    }

    static double metric(MetricTotals totals, String metric) {
        return switch (metric) {
            case "revenue" -> totals.revenue().doubleValue();
            case "units" -> totals.units();
            case "orders" -> totals.orders();
            default -> totals.orders() == 0 ? 0 : totals.revenue().doubleValue() / totals.orders();
        };
    }

    static double metric(MetricBucket bucket, String metric) {
        return metric(new MetricTotals(bucket.revenue(), bucket.units(), bucket.orders()), metric);
    }

    static double round(double value, String metric) {
        int scale = "avg_ticket".equals(metric) ? 2 : 0;
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP).doubleValue();
    }

    static double niceTarget(double previous) {
        if (previous <= 0) {
            return 1;
        }

        double raised = previous * 1.12;
        double magnitude = Math.pow(10, Math.floor(Math.log10(raised)));
        return Math.ceil(raised / magnitude) * magnitude;
    }

    private static String seriesVariant(String type) {
        if ("bar".equals(type)) {
            return "bar";
        }
        if ("area".equals(type)) {
            return "area";
        }
        return "line";
    }
}
