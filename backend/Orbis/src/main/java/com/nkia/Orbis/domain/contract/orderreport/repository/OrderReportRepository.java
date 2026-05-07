package com.nkia.Orbis.domain.contract.orderreport.repository;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderReportRepository extends JpaRepository<OrderReport, Long> {
}
