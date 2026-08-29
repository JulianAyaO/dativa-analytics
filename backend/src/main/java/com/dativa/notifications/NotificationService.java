package com.dativa.notifications;

import com.dativa.user.AppUser;
import com.dativa.user.AppUserRepository;
import com.dativa.user.Role;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationService {
    public static final String TOPIC = "/topic/notifications";

    private final NotificationRepository notifications;
    private final AppUserRepository users;
    private final SimpMessagingTemplate messaging;

    public NotificationService(
            NotificationRepository notifications,
            AppUserRepository users,
            SimpMessagingTemplate messaging) {
        this.notifications = notifications;
        this.users = users;
        this.messaging = messaging;
    }

    public List<NotificationDto> list(AppUser actor) {
        return notifications.findByRecipientIdOrderByCreatedAtDesc(actor.getId()).stream()
                .map(NotificationDto::from)
                .toList();
    }

    @Transactional
    public void markRead(AppUser actor, UUID id) {
        NotificationEntity entity = notifications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!actor.getId().equals(entity.getRecipientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        entity.setReadAt(Instant.now());
        notifications.save(entity);
    }

    @Transactional
    public void markAllRead(AppUser actor) {
        notifications.findByRecipientIdOrderByCreatedAtDesc(actor.getId()).forEach(item -> {
            if (item.getReadAt() == null) {
                item.setReadAt(Instant.now());
                notifications.save(item);
            }
        });
    }

    @Transactional
    public void broadcast(String type, String title, String body) {
        users.findAll().stream().filter(AppUser::isActive).filter(user -> visibleTo(type, user.getRole())).forEach(user -> {
            NotificationEntity entity = new NotificationEntity();
            entity.setId(UUID.randomUUID());
            entity.setRecipientId(user.getId());
            entity.setType(type);
            entity.setTitle(title);
            entity.setBody(body);
            entity.setCreatedAt(Instant.now());
            notifications.save(entity);
        });
        messaging.convertAndSend(TOPIC, new NotificationDto(UUID.randomUUID(), type, title, body, Instant.now(), null));
    }

    private static boolean visibleTo(String type, Role role) {
        return switch (type) {
            case "user_disabled", "user_enabled" -> role == Role.ADMIN;
            case "import_done", "import_failed" -> role == Role.ADMIN || role == Role.ANALYST;
            default -> true;
        };
    }
}
