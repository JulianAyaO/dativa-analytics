package com.dativa.alerts;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AlertDto(
        UUID id,
        String name,
        String dataset,
        String metric,
        String period,
        String region,
        String category,
        String product,
        String seller,
        String condition,
        BigDecimal threshold,
        int frequencyMinutes,
        boolean active,
        UUID dashboardId,
        Instant lastFiredAt,
        Instant createdAt,
        Instant updatedAt) {
    public static AlertDto from(AlertEntity entity) {
        return new AlertDto(
                entity.getId(),
                entity.getName(),
                entity.getDataset(),
                entity.getMetric(),
                entity.getPeriod(),
                entity.getRegion(),
                entity.getCategory(),
                entity.getProduct(),
                entity.getSeller(),
                entity.getCondition(),
                entity.getThreshold(),
                entity.getFrequencyMinutes(),
                entity.isActive(),
                entity.getDashboardId(),
                entity.getLastFiredAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
