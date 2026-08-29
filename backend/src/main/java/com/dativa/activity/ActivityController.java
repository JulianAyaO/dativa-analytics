package com.dativa.activity;

import com.dativa.user.UserService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/activity")
public class ActivityController {
    private final ActivityService activity;
    private final UserService users;

    public ActivityController(ActivityService activity, UserService users) {
        this.activity = activity;
        this.users = users;
    }

    @GetMapping
    public Page<ActivityEventResponse> list(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resourceType) {
        users.requireByEmail(authentication.getName());
        return activity
                .list(
                        PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")),
                        action,
                        resourceType)
                .map(ActivityEventResponse::from);
    }

    public record ActivityEventResponse(
            UUID id,
            UUID actorId,
            String actorName,
            String action,
            String resourceType,
            String summary,
            Instant createdAt) {
        static ActivityEventResponse from(ActivityEvent event) {
            return new ActivityEventResponse(
                    event.getId(),
                    event.getActorId(),
                    event.getActorName(),
                    event.getAction(),
                    event.getResourceType(),
                    event.getSummary(),
                    event.getCreatedAt());
        }
    }
}
