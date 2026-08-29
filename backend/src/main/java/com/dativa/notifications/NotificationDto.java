package com.dativa.notifications;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(UUID id, String type, String title, String body, Instant createdAt, Instant readAt) {
    public static NotificationDto from(NotificationEntity entity) {
        return new NotificationDto(
                entity.getId(),
                entity.getType(),
                entity.getTitle(),
                entity.getBody(),
                entity.getCreatedAt(),
                entity.getReadAt());
    }
}
