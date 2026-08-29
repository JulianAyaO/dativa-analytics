package com.dativa.user;

import java.time.Instant;
import java.util.UUID;

public record UserAdminResponse(
        UUID id,
        String email,
        String name,
        Role role,
        boolean active,
        Instant createdAt,
        Instant lastLoginAt) {
    public static UserAdminResponse from(AppUser user) {
        return new UserAdminResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                user.getLastLoginAt());
    }
}
