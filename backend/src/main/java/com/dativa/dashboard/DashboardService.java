package com.dativa.dashboard;

import com.dativa.activity.ActivityService;
import com.dativa.user.AppUser;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class DashboardService {
    private static final JsonMapper JSON = JsonMapper.shared();

    private final DashboardRepository dashboards;
    private final ActivityService activity;

    public DashboardService(DashboardRepository dashboards, ActivityService activity) {
        this.dashboards = dashboards;
        this.activity = activity;
    }

    public List<DashboardDto> list() {
        return dashboards.findAll().stream().map(this::toDto).toList();
    }

    public DashboardDto get(UUID id) {
        return toDto(require(id));
    }

    @Transactional
    public DashboardDto create(AppUser actor, DashboardDraftRequest request) {
        DashboardEntity entity = new DashboardEntity();
        entity.setId(UUID.randomUUID());
        entity.setName(request.name().trim());
        entity.setDescription(request.description() == null ? "" : request.description().trim());
        entity.setWidgets("[]");
        entity.setFilters("{}");
        entity.setFilterPresets("[]");
        entity.setUpdatedAt(Instant.now());
        dashboards.save(entity);
        activity.record(actor, "dashboard.created", "dashboard", "Se creó " + entity.getName());
        return toDto(entity);
    }

    @Transactional
    public DashboardDto save(AppUser actor, UUID id, DashboardDto body) {
        DashboardEntity entity = require(id);
        entity.setName(body.name());
        entity.setDescription(body.description() == null ? "" : body.description());
        entity.setWidgets(writeJson(body.widgets()));
        entity.setFilters(writeJson(body.filters()));
        entity.setFilterPresets(writeJson(body.filterPresets()));
        entity.setFeatured(body.featured());
        entity.setUpdatedAt(Instant.now());
        dashboards.save(entity);
        activity.record(actor, "dashboard.updated", "dashboard", "Se modificó " + entity.getName());
        return toDto(entity);
    }

    @Transactional
    public DashboardDto duplicate(AppUser actor, UUID id) {
        DashboardEntity source = require(id);
        DashboardEntity copy = new DashboardEntity();
        copy.setId(UUID.randomUUID());
        copy.setName(source.getName() + " (copia)");
        copy.setDescription(source.getDescription());
        copy.setWidgets(source.getWidgets());
        copy.setFilters(source.getFilters());
        copy.setFilterPresets(source.getFilterPresets());
        copy.setUpdatedAt(Instant.now());
        dashboards.save(copy);
        activity.record(actor, "dashboard.created", "dashboard", "Se duplicó " + source.getName());
        return toDto(copy);
    }

    @Transactional
    public void setDefault(UUID id) {
        require(id);
        dashboards.clearDefaults();
        DashboardEntity entity = require(id);
        entity.setDefault(true);
        dashboards.save(entity);
    }

    @Transactional
    public void incrementOpen(UUID id) {
        DashboardEntity entity = require(id);
        entity.setOpenCount(entity.getOpenCount() + 1);
        dashboards.save(entity);
    }

    @Transactional
    public void delete(AppUser actor, UUID id) {
        DashboardEntity entity = require(id);
        dashboards.delete(entity);
        activity.record(actor, "dashboard.deleted", "dashboard", "Se eliminó " + entity.getName());
    }

    private DashboardEntity require(UUID id) {
        return dashboards.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dashboard not found"));
    }

    private DashboardDto toDto(DashboardEntity entity) {
        return new DashboardDto(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                readJson(entity.getWidgets(), "[]"),
                readJson(entity.getFilters(), "{}"),
                readJson(entity.getFilterPresets(), "[]"),
                entity.isFeatured(),
                entity.isDefault(),
                entity.getOpenCount(),
                entity.getUpdatedAt());
    }

    private static Object readJson(String raw, String fallback) {
        try {
            return JSON.readValue(raw == null || raw.isBlank() ? fallback : raw, Object.class);
        } catch (RuntimeException exception) {
            return JSON.readValue(fallback, Object.class);
        }
    }

    private static String writeJson(Object node) {
        try {
            return JSON.writeValueAsString(node);
        } catch (RuntimeException exception) {
            return "null";
        }
    }
}
