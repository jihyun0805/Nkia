package com.nkia.Orbis.domain.maintenance.maintenancequotation.repository;

import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceQuotationRepository extends JpaRepository<MaintenanceQuotation, Long> {
    boolean existsByRefNo(String refNo);
}
