package com.nkia.Orbis.domain.maintenance.maintenance.repository;

import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceRepository extends JpaRepository<Maintenance, Long> {
}
