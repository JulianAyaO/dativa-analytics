package com.dativa.notifications;

import com.dativa.user.UserService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;
    private final UserService users;

    public NotificationController(NotificationService notifications, UserService users) {
        this.notifications = notifications;
        this.users = users;
    }

    @GetMapping
    public List<NotificationDto> list(Authentication authentication) {
        return notifications.list(users.requireByEmail(authentication.getName()));
    }

    @PostMapping("/{id}/read")
    public void markRead(Authentication authentication, @PathVariable UUID id) {
        notifications.markRead(users.requireByEmail(authentication.getName()), id);
    }

    @PostMapping("/read-all")
    public void markAll(Authentication authentication) {
        notifications.markAllRead(users.requireByEmail(authentication.getName()));
    }
}
