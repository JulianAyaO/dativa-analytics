package com.dativa.dashboard;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface DashboardRepository extends JpaRepository<DashboardEntity, UUID> {
    @Modifying
    @Query("update DashboardEntity d set d.isDefault = false")
    void clearDefaults();
}
