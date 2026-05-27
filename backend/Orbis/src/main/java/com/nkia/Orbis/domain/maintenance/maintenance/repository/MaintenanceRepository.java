package com.nkia.Orbis.domain.maintenance.maintenance.repository;

import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceRepository extends JpaRepository<Maintenance, Long> {
    List<Maintenance> findAllByTypeOrderByIdDesc(MaintenanceType type);

    @EntityGraph(attributePaths = {
            "project",
            "project.orderReport",
            "project.orderReport.finalCustomerCompany",
            "managerPrimary",
            "salesRep"
    })
    List<Maintenance> findByTypeAndEndDate(MaintenanceType type, LocalDate endDate);
}
