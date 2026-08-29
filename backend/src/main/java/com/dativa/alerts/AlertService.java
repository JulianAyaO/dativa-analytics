package com.dativa.alerts;

import com.dativa.activity.ActivityService;
import com.dativa.user.AppUser;
import com.dativa.user.Role;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AlertService {
    private final AlertRepository alerts;
    private final ActivityService activity;

    public AlertService(AlertRepository alerts, ActivityService activity) {
        this.alerts = alerts;
        this.activity = activity;
    }

    public List<AlertDto> list() {
        return alerts.findAll().stream().map(AlertDto::from).toList();
    }

    @Transactional
    public AlertDto save(AppUser actor, AlertDto body, boolean create) {
        forbidViewer(actor);
        AlertEntity entity = create
                ? new AlertEntity()
                : alerts.findById(body.id())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert not found"));
        if (create) {
            entity.setId(body.id() == null ? UUID.randomUUID() : body.id());
            entity.setCreatedAt(Instant.now());
            entity.setCreatedBy(actor.getId());
        }
        entity.setName(body.name());
        entity.setDataset(body.dataset());
        entity.setMetric(body.metric());
        entity.setPeriod(body.period());
        entity.setRegion(blank(body.region()));
        entity.setCategory(blank(body.category()));
        entity.setProduct(blank(body.product()));
        entity.setSeller(blank(body.seller()));
        entity.setCondition(body.condition());
        entity.setThreshold(body.threshold());
        entity.setFrequencyMinutes(body.frequencyMinutes() <= 0 ? 5 : body.frequencyMinutes());
        entity.setActive(body.active());
        entity.setDashboardId(body.dashboardId());
        entity.setUpdatedAt(Instant.now());
        alerts.save(entity);
        activity.record(
                actor,
                create ? "alert.created" : "alert.updated",
                "alert",
                (create ? "Se creó " : "Se modificó ") + entity.getName());
        return AlertDto.from(entity);
    }

    @Transactional
    public void delete(AppUser actor, UUID id) {
        forbidViewer(actor);
        AlertEntity entity = alerts.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert not found"));
        alerts.delete(entity);
        activity.record(actor, "alert.deleted", "alert", "Se eliminó " + entity.getName());
    }

    private static void forbidViewer(AppUser actor) {
        if (actor.getRole() == Role.VIEWER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Viewers cannot manage alerts");
        }
    }

    private static String blank(String value) {
        return value == null ? "" : value;
    }
}
