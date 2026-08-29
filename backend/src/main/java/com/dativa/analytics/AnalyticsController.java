package com.dativa.analytics;

import com.dativa.analytics.AnalyticsQueryService.TransactionExport;
import com.dativa.analytics.dto.TransactionExportRequest;
import com.dativa.analytics.dto.TransactionPageResponse;
import com.dativa.analytics.dto.WidgetQueryRequest;
import com.dativa.analytics.dto.WidgetResultResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsQueryService analytics;

    public AnalyticsController(AnalyticsQueryService analytics) {
        this.analytics = analytics;
    }

    @PostMapping("/query")
    public WidgetResultResponse query(@Valid @RequestBody WidgetQueryRequest request) {
        return analytics.execute(request);
    }

    @GetMapping("/transactions")
    public TransactionPageResponse transactions(
            @RequestParam String dataset,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String product,
            @RequestParam(required = false) String seller,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String dir,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return analytics.transactions(dataset, period, region, category, product, seller, q, sort, dir, page, size);
    }

    @GetMapping("/transactions/export")
    public ResponseEntity<byte[]> exportQuery(
            @RequestParam String dataset,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String product,
            @RequestParam(required = false) String seller,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String dir,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String columns) {
        return file(analytics.exportQuery(
                dataset, period, region, category, product, seller, q, sort, dir, format, split(columns)));
    }

    @PostMapping("/transactions/export")
    public ResponseEntity<byte[]> exportSelection(@RequestBody TransactionExportRequest request) {
        return file(analytics.exportSelection(request.ids(), request.format(), request.columns()));
    }

    private static ResponseEntity<byte[]> file(TransactionExport exported) {
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(exported.filename()).build().toString())
                .contentType(MediaType.parseMediaType(exported.contentType()))
                .body(exported.body());
    }

    private static List<String> split(String columns) {
        if (columns == null || columns.isBlank()) {
            return List.of();
        }
        return Arrays.stream(columns.split(",")).map(String::trim).filter(item -> !item.isEmpty()).toList();
    }
}
