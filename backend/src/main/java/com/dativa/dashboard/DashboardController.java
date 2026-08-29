package com.dativa.dashboard;

import com.dativa.user.AppUser;
import com.dativa.user.UserService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboards")
public class DashboardController {
    private final DashboardService dashboards;
    private final UserService users;

    public DashboardController(DashboardService dashboards, UserService users) {
        this.dashboards = dashboards;
        this.users = users;
    }

    @GetMapping
    public List<DashboardDto> list() {
        return dashboards.list();
    }

    @GetMapping("/{id}")
    public DashboardDto get(@PathVariable UUID id) {
        return dashboards.get(id);
    }

    @PostMapping
    public DashboardDto create(Authentication authentication, @Valid @RequestBody DashboardDraftRequest request) {
        return dashboards.create(actor(authentication), request);
    }

    @PutMapping("/{id}")
    public DashboardDto save(
            Authentication authentication, @PathVariable UUID id, @RequestBody DashboardDto body) {
        return dashboards.save(actor(authentication), id, body);
    }

    @PostMapping("/{id}/duplicate")
    public DashboardDto duplicate(Authentication authentication, @PathVariable UUID id) {
        return dashboards.duplicate(actor(authentication), id);
    }

    @PostMapping("/{id}/default")
    public void setDefault(@PathVariable UUID id) {
        dashboards.setDefault(id);
    }

    @PostMapping("/{id}/open")
    public void open(@PathVariable UUID id) {
        dashboards.incrementOpen(id);
    }

    @DeleteMapping("/{id}")
    public void delete(Authentication authentication, @PathVariable UUID id) {
        dashboards.delete(actor(authentication), id);
    }

    private AppUser actor(Authentication authentication) {
        return users.requireByEmail(authentication.getName());
    }
}
