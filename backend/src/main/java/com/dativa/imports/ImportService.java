package com.dativa.imports;

import com.dativa.activity.ActivityService;
import com.dativa.notifications.NotificationService;
import com.dativa.user.AppUser;
import com.dativa.user.Role;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ImportService {
    private final ImportJdbcRepository jdbc;
    private final ActivityService activity;
    private final NotificationService notifications;

    public ImportService(
            ImportJdbcRepository jdbc, ActivityService activity, NotificationService notifications) {
        this.jdbc = jdbc;
        this.activity = activity;
        this.notifications = notifications;
    }

    @Transactional
    public ImportCommitResult commit(AppUser actor, ImportCommitRequest request) {
        if (actor.getRole() == Role.VIEWER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Viewers cannot import data");
        }
        String dataset = request.dataset();
        if (!dataset.equals("sales") && !dataset.equals("orders")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dataset must be sales or orders");
        }
        Set<String> seen = new HashSet<>(jdbc.fingerprints(dataset));
        int imported = 0;
        int skippedDuplicates = 0;
        for (ImportRowRequest row : request.rows()) {
            String fingerprint = ImportFingerprint.of(
                    dataset,
                    row.occurredAt(),
                    row.region(),
                    row.category(),
                    row.product(),
                    row.seller(),
                    row.quantity(),
                    row.unitPrice(),
                    row.amount());
            if (!seen.add(fingerprint)) {
                skippedDuplicates += 1;
                continue;
            }
            UUID regionId = jdbc.findOrCreateNamed("regions", row.region().trim());
            UUID categoryId = jdbc.findOrCreateNamed("categories", row.category().trim());
            UUID sellerId = jdbc.findOrCreateNamed("sellers", row.seller().trim());
            BigDecimal unitPrice = row.unitPrice() == null || row.unitPrice().signum() <= 0
                    ? BigDecimal.ONE
                    : row.unitPrice();
            UUID productId = jdbc.findOrCreateProduct(row.product().trim(), categoryId, unitPrice);
            jdbc.insertOrder(
                    UUID.randomUUID(),
                    dataset,
                    row.occurredAt(),
                    regionId,
                    sellerId,
                    UUID.randomUUID(),
                    productId,
                    Math.max(row.quantity(), 1),
                    unitPrice,
                    row.amount() == null || row.amount().signum() <= 0 ? unitPrice : row.amount());
            imported += 1;
        }
        activity.record(
                actor,
                "import.completed",
                "import",
                skippedDuplicates > 0
                        ? "Importación de " + imported + " filas en " + dataset + ". " + skippedDuplicates
                                + " duplicadas omitidas."
                        : "Importación de " + imported + " filas en " + dataset);
        notifications.broadcast(
                "import_done",
                "Importación completada",
                skippedDuplicates > 0
                        ? imported + " filas importadas en " + dataset + ". " + skippedDuplicates
                                + " duplicadas omitidas."
                        : imported + " filas importadas en " + dataset);
        return new ImportCommitResult(imported, skippedDuplicates);
    }
}
