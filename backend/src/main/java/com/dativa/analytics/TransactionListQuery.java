package com.dativa.analytics;

public record TransactionListQuery(
        ResolvedQuery resolved,
        String search,
        TransactionSort sort,
        String direction,
        int page,
        int size) {

    public boolean ascending() {
        return "ASC".equals(direction);
    }
}
