package com.nkia.Orbis.domain.maintenance.maintenancequotation.repository;

import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface MaintenanceQuotationRepository extends JpaRepository<MaintenanceQuotation, Long> {
    boolean existsByRefNo(String refNo);

    @Query(value = "SELECT ref_no FROM maintenance_quotation WHERE ref_no LIKE :prefix% ORDER BY ref_no DESC LIMIT 1", nativeQuery = true)
    Optional<String> findLastRefNoIncludingDeleted(@Param("prefix") String prefix);
}
