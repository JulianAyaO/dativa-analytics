package com.dativa.auth;

import com.dativa.user.AppUser;
import com.dativa.user.Role;
import java.util.UUID;

public record LoginResponse(String accessToken, String tokenType, UserResponse user) {
    public record UserResponse(UUID id, String email, String name, Role role) {
        public static UserResponse from(AppUser user) {
            return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
        }
    }
}
