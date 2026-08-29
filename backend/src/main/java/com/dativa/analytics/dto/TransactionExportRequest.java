package com.dativa.analytics.dto;

import java.util.List;
import java.util.UUID;

public record TransactionExportRequest(String format, List<UUID> ids, List<String> columns) {}
