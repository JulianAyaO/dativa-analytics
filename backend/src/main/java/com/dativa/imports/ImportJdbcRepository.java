package com.dativa.imports;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ImportJdbcRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public ImportJdbcRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID findOrCreateNamed(String table, String name) {
        UUID existing = jdbc.query(
                "SELECT id FROM " + table + " WHERE lower(name) = lower(:name) LIMIT 1",
                Map.of("name", name),
                rs -> rs.next() ? rs.getObject("id", UUID.class) : null);
        if (existing != null) {
            return existing;
        }
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO " + table + " (id, name) VALUES (:id, :name)",
                Map.of("id", id, "name", name));
        return id;
    }

    public UUID findOrCreateProduct(String name, UUID categoryId, BigDecimal unitPrice) {
        UUID existing = jdbc.query(
                "SELECT id FROM products WHERE lower(name) = lower(:name) LIMIT 1",
                Map.of("name", name),
                rs -> rs.next() ? rs.getObject("id", UUID.class) : null);
        if (existing != null) {
            return existing;
        }
        UUID id = UUID.randomUUID();
        String sku = "IMP-" + id.toString().substring(0, 8).toUpperCase();
        jdbc.update(
                """
                INSERT INTO products (id, sku, name, category_id, unit_price)
                VALUES (:id, :sku, :name, :categoryId, :unitPrice)
                """,
                Map.of(
                        "id",
                        id,
                        "sku",
                        sku,
                        "name",
                        name,
                        "categoryId",
                        categoryId,
                        "unitPrice",
                        unitPrice));
        return id;
    }

    public void insertOrder(
            UUID orderId,
            String dataset,
            Instant occurredAt,
            UUID regionId,
            UUID sellerId,
            UUID lineId,
            UUID productId,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal amount) {
        Map<String, Object> order = new HashMap<>();
        order.put("id", orderId);
        order.put("dataset", dataset);
        order.put("orderedAt", java.sql.Timestamp.from(occurredAt));
        order.put("regionId", regionId);
        order.put("sellerId", sellerId);
        jdbc.update(
                """
                INSERT INTO orders (id, dataset, ordered_at, region_id, seller_id)
                VALUES (:id, :dataset, :orderedAt, :regionId, :sellerId)
                """,
                order);
        Map<String, Object> line = new HashMap<>();
        line.put("id", lineId);
        line.put("orderId", orderId);
        line.put("productId", productId);
        line.put("quantity", quantity);
        line.put("unitPrice", unitPrice);
        line.put("amount", amount);
        jdbc.update(
                """
                INSERT INTO order_lines (id, order_id, product_id, quantity, unit_price, amount)
                VALUES (:id, :orderId, :productId, :quantity, :unitPrice, :amount)
                """,
                line);
    }

    public Set<String> fingerprints(String dataset) {
        return new HashSet<>(
                jdbc.query(
                        """
                        SELECT o.ordered_at, r.name AS region, c.name AS category, p.name AS product,
                               s.name AS seller, l.quantity, l.unit_price, l.amount
                        FROM orders o
                        JOIN order_lines l ON l.order_id = o.id
                        JOIN products p ON p.id = l.product_id
                        JOIN categories c ON c.id = p.category_id
                        JOIN regions r ON r.id = o.region_id
                        JOIN sellers s ON s.id = o.seller_id
                        WHERE o.dataset = :dataset
                        """,
                        Map.of("dataset", dataset),
                        (rs, rowNum) ->
                                ImportFingerprint.of(
                                        dataset,
                                        rs.getTimestamp("ordered_at").toInstant(),
                                        rs.getString("region"),
                                        rs.getString("category"),
                                        rs.getString("product"),
                                        rs.getString("seller"),
                                        rs.getInt("quantity"),
                                        rs.getBigDecimal("unit_price"),
                                        rs.getBigDecimal("amount"))));
    }
}
