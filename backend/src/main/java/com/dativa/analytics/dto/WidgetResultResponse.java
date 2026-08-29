package com.dativa.analytics.dto;

public record WidgetResultResponse(
        String status, WidgetQueryRequest query, String family, Object data, String message) {

    public static WidgetResultResponse ready(WidgetQueryRequest query, String family, Object data) {
        return new WidgetResultResponse("ready", query, family, data, null);
    }

    public static WidgetResultResponse empty(WidgetQueryRequest query, String family) {
        return new WidgetResultResponse("empty", query, family, null, null);
    }
}
