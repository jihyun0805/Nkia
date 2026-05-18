package com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.repository;

import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity.MaintenanceQuotationHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceQuotationHistoryRepository extends JpaRepository<MaintenanceQuotationHistory, Long> {
    
    List<MaintenanceQuotationHistory> findByRefNoStartingWithOrderByVersionDesc(String baseRefNo);

    long countByRefNoStartingWith(String baseRefNo);
}
