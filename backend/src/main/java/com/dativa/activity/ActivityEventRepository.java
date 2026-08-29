package com.dativa.activity;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityEventRepository extends JpaRepository<ActivityEvent, UUID> {
    Page<ActivityEvent> findByAction(String action, Pageable pageable);

    Page<ActivityEvent> findByResourceType(String resourceType, Pageable pageable);

    Page<ActivityEvent> findByActionAndResourceType(String action, String resourceType, Pageable pageable);
}
