package com.dativa.analytics;

import com.dativa.analytics.dto.MetricBucket;
import com.dativa.analytics.dto.MetricTotals;
import com.dativa.analytics.dto.TransactionRow;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AnalyticsJdbcRepository {
    private static final String FROM_JOIN = """
            FROM orders o
            JOIN order_lines l ON l.order_id = o.id
            JOIN products p ON p.id = l.product_id
            JOIN categories c ON c.id = p.category_id
            JOIN regions r ON r.id = o.region_id
            JOIN sellers s ON s.id = o.seller_id
            """;

    private static final String WHERE = """
            WHERE o.dataset = :dataset
              AND o.ordered_at >= :fromInclusive
              AND o.ordered_at < :toExclusive
              AND (:region = '' OR r.name = ANY(string_to_array(:region, ',')))
              AND (:category = '' OR c.name = ANY(string_to_array(:category, ',')))
              AND (:product = '' OR p.name = ANY(string_to_array(:product, ',')))
              AND (:seller = '' OR s.name = ANY(string_to_array(:seller, ',')))
              AND (
                    :search = ''
                    OR r.name ILIKE :searchLike
                    OR c.name ILIKE :searchLike
                    OR p.name ILIKE :searchLike
                    OR s.name ILIKE :searchLike
              )
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public AnalyticsJdbcRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public MetricTotals totals(ResolvedQuery query, Instant fromInclusive, Instant toExclusive) {
        String sql = """
                SELECT COALESCE(SUM(l.amount), 0) AS revenue,
                       COALESCE(SUM(l.quantity), 0) AS units,
                       COUNT(DISTINCT o.id) AS orders
                """ + FROM_JOIN + WHERE;

        MetricTotals totals = jdbc.queryForObject(
                sql, params(query, fromInclusive, toExclusive), (rs, rowNum) -> new MetricTotals(
                        rs.getBigDecimal("revenue"), rs.getLong("units"), rs.getLong("orders")));
        return totals == null ? MetricTotals.empty() : totals;
    }

    public List<MetricBucket> aggregate(
            ResolvedQuery query, Instant fromInclusive, Instant toExclusive) {
        String bucket = bucketExpression(query);
        String sql = """
                SELECT %s AS bucket_key,
                       COALESCE(SUM(l.amount), 0) AS revenue,
                       COALESCE(SUM(l.quantity), 0) AS units,
                       COUNT(DISTINCT o.id) AS orders
                """.formatted(bucket) + FROM_JOIN + WHERE + " GROUP BY bucket_key ORDER BY bucket_key";

        return jdbc.query(sql, params(query, fromInclusive, toExclusive), (rs, rowNum) -> {
            String key = rs.getString("bucket_key");
            return new MetricBucket(
                    key, key, rs.getBigDecimal("revenue"), rs.getLong("units"), rs.getLong("orders"));
        });
    }

    public long countTransactions(TransactionListQuery query) {
        String sql = "SELECT COUNT(*) " + FROM_JOIN + WHERE;
        Long count = jdbc.queryForObject(sql, params(query), Long.class);
        return count == null ? 0 : count;
    }

    public List<TransactionRow> findTransactions(TransactionListQuery query) {
        String sql = """
                SELECT l.id,
                       o.dataset,
                       o.ordered_at,
                       r.name AS region,
                       c.name AS category,
                       p.name AS product,
                       s.name AS seller,
                       l.quantity,
                       l.unit_price,
                       l.amount
                """ + FROM_JOIN + WHERE + " ORDER BY " + query.sort().sql() + " " + query.direction()
                + ", l.id DESC LIMIT :limit OFFSET :offset";

        Map<String, Object> params = params(query);
        params.put("limit", query.size());
        params.put("offset", (long) query.page() * query.size());
        return jdbc.query(sql, params, this::mapRow);
    }

    public List<TransactionRow> findTransactionsByIds(List<java.util.UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }

        String sql = """
                SELECT l.id,
                       o.dataset,
                       o.ordered_at,
                       r.name AS region,
                       c.name AS category,
                       p.name AS product,
                       s.name AS seller,
                       l.quantity,
                       l.unit_price,
                       l.amount
                """ + FROM_JOIN + """
                WHERE l.id IN (:ids)
                ORDER BY o.ordered_at DESC, l.id DESC
                """;

        return jdbc.query(sql, Map.of("ids", ids), this::mapRow);
    }

    private TransactionRow mapRow(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new TransactionRow(
                rs.getObject("id", java.util.UUID.class),
                rs.getString("dataset"),
                toInstant(rs.getTimestamp("ordered_at")),
                rs.getString("region"),
                rs.getString("category"),
                rs.getString("product"),
                rs.getString("seller"),
                rs.getInt("quantity"),
                rs.getBigDecimal("unit_price"),
                rs.getBigDecimal("amount"));
    }

    private static Map<String, Object> params(TransactionListQuery query) {
        Map<String, Object> params = params(
                query.resolved(), query.resolved().fromInclusive(), query.resolved().toExclusive());
        params.put("search", query.search());
        params.put("searchLike", "%" + query.search() + "%");
        return params;
    }

    private static Map<String, Object> params(ResolvedQuery query, Instant fromInclusive, Instant toExclusive) {
        Map<String, Object> params = new java.util.HashMap<>();
        params.put("dataset", query.dataset());
        params.put("fromInclusive", Timestamp.from(fromInclusive));
        params.put("toExclusive", Timestamp.from(toExclusive));
        params.put("region", query.filters().region());
        params.put("category", query.filters().category());
        params.put("product", query.filters().product());
        params.put("seller", query.filters().seller());
        params.put("search", "");
        params.put("searchLike", "%");
        return params;
    }

    private static String bucketExpression(ResolvedQuery query) {
        if (!query.usesTimeDimension()) {
            return switch (query.dimension()) {
                case "region" -> "r.name";
                case "category" -> "c.name";
                case "product" -> "p.name";
                case "seller" -> "s.name";
                default -> throw new InvalidAnalyticsQueryException("Dimensión no soportada");
            };
        }

        if (query.isDaily()) {
            return "to_char((o.ordered_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD')";
        }

        return "to_char(date_trunc('month', o.ordered_at AT TIME ZONE 'UTC'), 'YYYY-MM')";
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? Instant.EPOCH : timestamp.toInstant();
    }
}
