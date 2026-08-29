package com.dativa.dashboard;

import jakarta.validation.constraints.NotBlank;

public record DashboardDraftRequest(@NotBlank String name, String description) {}
