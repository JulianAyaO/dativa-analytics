package com.dativa.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
        @NotBlank String name, @Email @NotBlank String email, @NotBlank String emailConfirm) {}
