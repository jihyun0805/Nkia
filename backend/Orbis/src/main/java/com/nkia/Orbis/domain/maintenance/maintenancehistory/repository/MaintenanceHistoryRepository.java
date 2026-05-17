package com.nkia.Orbis.domain.maintenance.maintenancehistory.repository;

import com.nkia.Orbis.domain.maintenance.maintenancehistory.entity.MaintenanceHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceHistoryRepository extends JpaRepository<MaintenanceHistory, Long> {
    
    List<MaintenanceHistory> findByMaintenanceIdOrderByVersionDesc(Long maintenanceId);

    long countByMaintenanceId(Long maintenanceId);
}
