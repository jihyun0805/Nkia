package com.nkia.Orbis.domain.contract.orderreport.repository;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderReportRepository extends JpaRepository<OrderReport, Long> {

    @Query(
            value = """
                    SELECT order_report_code
                    FROM order_report
                    WHERE order_report_code LIKE CONCAT(:prefix, '%')
                    ORDER BY order_report_code DESC
                    LIMIT 1
                    """,
            nativeQuery = true
    )
    Optional<String> findLastOrderReportCodeIncludingDeleted(@Param("prefix") String prefix);

    @Query("SELECT o FROM OrderReport o " +
            "WHERE o.contractStartDate <= :end AND o.contractEndDate >= :start")
    List<OrderReport> findAllOverlappingYear(
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
