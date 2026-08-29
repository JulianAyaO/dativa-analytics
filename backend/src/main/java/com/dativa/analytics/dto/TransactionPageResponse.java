package com.dativa.analytics.dto;

import java.util.List;

public record TransactionPageResponse(
        List<TransactionRow> items, int page, int size, long totalElements, int totalPages) {}
