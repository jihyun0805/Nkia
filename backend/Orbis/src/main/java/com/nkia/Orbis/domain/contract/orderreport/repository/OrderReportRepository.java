package com.nkia.Orbis.domain.contract.orderreport.repository;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
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
            "WHERE o.contractStartDate <= :end AND o.contractEndDate >= :start " +
            "AND o.status = 'APPROVED'")
    List<OrderReport> findAllOverlappingYear(
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);

    /**
     * [1] 목록 조회 최적화
     */
    @EntityGraph(attributePaths = {
            "pm",
            "projectOpportunity",
            // DTO에서 최종 고객사 이름(finalCustomerCompanyName)을 쓰기 때문에 반드시 포함
            "finalCustomerCompany",
            // --- N+1 방어용 추가 (1:1 mappedBy) ---
            "projectOpportunity.rfpAnalyzeResult",
            "projectOpportunity.prb",
            "projectOpportunity.bidResult"
    })
    @Override
    List<OrderReport> findAll();

    /**
     * [2] 상세 조회 최적화
     */
    @EntityGraph(attributePaths = {
            "pm",
            "projectOpportunity",
            "contractCounterpartCompany",
            "finalCustomerCompany",
            // DTO에서 담당자 이름을 쓰기 때문에 반드시 포함
            "contractCounterpartManager",
            "finalCustomerManager",
            // --- N+1 방어용 추가 (1:1 mappedBy) ---
            "projectOpportunity.rfpAnalyzeResult",
            "projectOpportunity.prb",
            "projectOpportunity.bidResult"
    })
    @Override
    Optional<OrderReport> findById(Long id);
}
