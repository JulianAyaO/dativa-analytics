package com.dativa.alerts;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRepository extends JpaRepository<AlertEntity, UUID> {
    List<AlertEntity> findByActiveTrue();
}
