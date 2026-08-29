package com.dativa.analytics;

import com.dativa.analytics.dto.MetricBucket;
import com.dativa.analytics.dto.MetricTotals;
import com.dativa.analytics.dto.TransactionPageResponse;
import com.dativa.analytics.dto.WidgetQueryRequest;
import com.dativa.analytics.dto.WidgetResultResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsQueryService {
    private final AnalyticsQueryValidator validator;
    private final AnalyticsJdbcRepository repository;
    private final AnalyticsResultMapper mapper;
    private final PeriodWindows periods;

    public AnalyticsQueryService(
            AnalyticsQueryValidator validator,
            AnalyticsJdbcRepository repository,
            AnalyticsResultMapper mapper,
            PeriodWindows periods) {
        this.validator = validator;
        this.repository = repository;
        this.mapper = mapper;
        this.periods = periods;
    }

    public WidgetResultResponse execute(WidgetQueryRequest request) {
        ResolvedQuery query = validator.resolve(request);
        MetricTotals current = repository.totals(query, query.fromInclusive(), query.toExclusive());
        MetricTotals previous = repository.totals(query, query.previousFrom(), query.previousTo());

        PeriodWindows.Range currentRange = periods.current(query.period());
        PeriodWindows.Range previousRange = periods.previous(currentRange);
        List<PeriodWindows.BucketKey> timeKeys = periods.timeKeys(query.period(), currentRange);
        List<PeriodWindows.BucketKey> previousTimeKeys = periods.timeKeys(query.period(), previousRange);
        List<MetricBucket> currentBuckets;
        List<MetricBucket> previousBuckets;

        if (query.kind() == AggregationKind.SCALAR) {
            currentBuckets = repository.aggregate(withDimension(query, "month"), query.fromInclusive(), query.toExclusive());
            previousBuckets = List.of();
        } else if (query.kind() == AggregationKind.PROGRESS) {
            currentBuckets = List.of();
            previousBuckets = List.of();
        } else {
            currentBuckets = repository.aggregate(query, query.fromInclusive(), query.toExclusive());
            previousBuckets = query.kind() == AggregationKind.SERIES
                    ? repository.aggregate(query, query.previousFrom(), query.previousTo())
                    : List.of();
        }

        return mapper.toResult(
                query, current, previous, currentBuckets, previousBuckets, timeKeys, previousTimeKeys);
    }

    public TransactionPageResponse transactions(
            String dataset,
            String period,
            String region,
            String category,
            String product,
            String seller,
            String search,
            String sort,
            String direction,
            int page,
            int size) {
        TransactionListQuery query = validator.resolveList(
                dataset, period, region, category, product, seller, search, sort, direction, page, size);
        long total = repository.countTransactions(query);
        int totalPages = size == 0 ? 0 : (int) Math.ceil(total / (double) size);
        return new TransactionPageResponse(repository.findTransactions(query), page, size, total, totalPages);
    }

    public TransactionExport exportQuery(
            String dataset,
            String period,
            String region,
            String category,
            String product,
            String seller,
            String search,
            String sort,
            String direction,
            String format,
            List<String> columns) {
        TransactionListQuery query = validator.resolveExport(
                dataset, period, region, category, product, seller, search, sort, direction);
        return export(repository.findTransactions(query), format, columns);
    }

    public TransactionExport exportSelection(List<java.util.UUID> ids, String format, List<String> columns) {
        if (ids == null || ids.isEmpty()) {
            throw new InvalidAnalyticsQueryException("No hay filas seleccionadas");
        }
        if (ids.size() > 500) {
            throw new InvalidAnalyticsQueryException("La selección es demasiado grande");
        }
        return export(repository.findTransactionsByIds(ids), format, columns);
    }

    private static TransactionExport export(
            List<com.dativa.analytics.dto.TransactionRow> rows, String format, List<String> columns) {
        List<String> selected = TransactionExportWriter.columns(columns);
        if ("xlsx".equalsIgnoreCase(format) || "xls".equalsIgnoreCase(format)) {
            return new TransactionExport(
                    "transacciones.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    TransactionExportWriter.excel(rows, selected));
        }
        if (format == null || format.isBlank() || "csv".equalsIgnoreCase(format)) {
            return new TransactionExport(
                    "transacciones.csv", "text/csv; charset=UTF-8", TransactionExportWriter.csv(rows, selected));
        }
        throw new InvalidAnalyticsQueryException("Formato de exportación no soportado");
    }

    public record TransactionExport(String filename, String contentType, byte[] body) {}

    private static ResolvedQuery withDimension(ResolvedQuery query, String dimension) {
        return new ResolvedQuery(
                query.type(),
                query.family(),
                query.kind(),
                query.dataset(),
                query.metric(),
                dimension,
                query.period(),
                query.topN(),
                query.filters(),
                query.fromInclusive(),
                query.toExclusive(),
                query.previousFrom(),
                query.previousTo(),
                query.echo());
    }
}
