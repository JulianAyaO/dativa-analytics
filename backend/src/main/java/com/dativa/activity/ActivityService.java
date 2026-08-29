package com.dativa.activity;

import com.dativa.user.AppUser;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityService {
    private final ActivityEventRepository events;

    public ActivityService(ActivityEventRepository events) {
        this.events = events;
    }

    @Transactional
    public void record(AppUser actor, String action, String resourceType, String summary) {
        ActivityEvent event = new ActivityEvent();
        event.setId(UUID.randomUUID());
        if (actor != null) {
            event.setActorId(actor.getId());
            event.setActorName(actor.getFullName());
        } else {
            event.setActorName("Sistema");
        }
        event.setAction(action);
        event.setResourceType(resourceType);
        event.setSummary(summary);
        event.setCreatedAt(Instant.now());
        events.save(event);
    }

    public Page<ActivityEvent> list(Pageable pageable, String action, String resourceType) {
        boolean hasAction = action != null && !action.isBlank();
        boolean hasType = resourceType != null && !resourceType.isBlank();
        if (hasAction && hasType) {
            return events.findByActionAndResourceType(action, resourceType, pageable);
        }
        if (hasAction) {
            return events.findByAction(action, pageable);
        }
        if (hasType) {
            return events.findByResourceType(resourceType, pageable);
        }
        return events.findAll(pageable);
    }
}
