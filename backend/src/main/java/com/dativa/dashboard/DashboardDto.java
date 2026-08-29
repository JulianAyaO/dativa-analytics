package com.dativa.dashboard;

import java.time.Instant;
import java.util.UUID;

public record DashboardDto(
        UUID id,
        String name,
        String description,
        Object widgets,
        Object filters,
        Object filterPresets,
        boolean featured,
        boolean isDefault,
        int openCount,
        Instant updatedAt) {}
