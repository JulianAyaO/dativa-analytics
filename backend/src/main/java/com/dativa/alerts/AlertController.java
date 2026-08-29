package com.dativa.alerts;

import com.dativa.user.UserService;
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
@RequestMapping("/api/alerts")
public class AlertController {
    private final AlertService alerts;
    private final UserService users;

    public AlertController(AlertService alerts, UserService users) {
        this.alerts = alerts;
        this.users = users;
    }

    @GetMapping
    public List<AlertDto> list() {
        return alerts.list();
    }

    @PostMapping
    public AlertDto create(Authentication authentication, @RequestBody AlertDto body) {
        return alerts.save(users.requireByEmail(authentication.getName()), body, true);
    }

    @PutMapping("/{id}")
    public AlertDto update(Authentication authentication, @PathVariable UUID id, @RequestBody AlertDto body) {
        return alerts.save(
                users.requireByEmail(authentication.getName()),
                new AlertDto(
                        id,
                        body.name(),
                        body.dataset(),
                        body.metric(),
                        body.period(),
                        body.region(),
                        body.category(),
                        body.product(),
                        body.seller(),
                        body.condition(),
                        body.threshold(),
                        body.frequencyMinutes(),
                        body.active(),
                        body.dashboardId(),
                        body.lastFiredAt(),
                        body.createdAt(),
                        body.updatedAt()),
                false);
    }

    @DeleteMapping("/{id}")
    public void delete(Authentication authentication, @PathVariable UUID id) {
        alerts.delete(users.requireByEmail(authentication.getName()), id);
    }
}
