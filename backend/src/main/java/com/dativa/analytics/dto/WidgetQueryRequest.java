package com.dativa.analytics.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record WidgetQueryRequest(
        @NotBlank(message = "El tipo de widget es obligatorio") String type,
        @Valid @NotNull(message = "La configuración del widget es obligatoria") WidgetConfigRequest config,
        DashboardFiltersRequest filters) {

    public record WidgetConfigRequest(
            @NotBlank(message = "La fuente de datos es obligatoria") String dataset,
            @NotBlank(message = "La métrica es obligatoria") String metric,
            String dimension,
            String period,
            Integer topN) {}

    public record DashboardFiltersRequest(
            String period, String region, String category, String product, String seller) {
        public static DashboardFiltersRequest empty() {
            return new DashboardFiltersRequest("", "", "", "", "");
        }

        public DashboardFiltersRequest normalized() {
            return new DashboardFiltersRequest(
                    blankToEmpty(period),
                    joinKnownValues(region),
                    joinKnownValues(category),
                    joinKnownValues(product),
                    joinKnownValues(seller));
        }

        private static String blankToEmpty(String value) {
            return value == null ? "" : value.trim();
        }

        private static String joinKnownValues(String value) {
            if (value == null || value.isBlank()) {
                return "";
            }
            return java.util.Arrays.stream(value.split(","))
                    .map(String::trim)
                    .filter(part -> !part.isEmpty())
                    .distinct()
                    .collect(java.util.stream.Collectors.joining(","));
        }
    }
}
