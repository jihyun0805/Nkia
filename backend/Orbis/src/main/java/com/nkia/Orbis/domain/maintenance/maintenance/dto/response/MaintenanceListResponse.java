package com.nkia.Orbis.domain.maintenance.maintenance.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

/**
 * 유지보수 목록 조회 응답 DTO
 */
@Getter
@Builder
public class MaintenanceListResponse {

    private String customerName;

    private String projectName;

    private String productFamilyName;

    private Long contractAmount;

    private LocalDate startDate;

    private LocalDate endDate;

    private String inspectionMethod;

    private String salesRepName;

    private String managerPrimaryName;

    /**
     * 엔티티를 DTO로 변환 (NPE 방지 처리 포함)
     */
    public static MaintenanceListResponse from(Maintenance m) {
        String customerName = m.getProject() != null && m.getProject().getOrderReport() != null &&
                m.getProject().getOrderReport().getFinalCustomerCompany() != null ?
                m.getProject().getOrderReport().getFinalCustomerCompany().getName() : "-";

        return MaintenanceListResponse.builder()
                .customerName(customerName)
                .projectName(m.getProject() != null ? m.getProject().getPjtName() : "-")
                .productFamilyName(m.getProductFamily() != null ? m.getProductFamily().name() : null)
                .contractAmount(m.getContractAmount())
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .inspectionMethod(m.getInspectionCycle() != null ? m.getInspectionCycle().getDescription() : null)
                .salesRepName(m.getSalesRep() != null ? m.getSalesRep().getName() : null)
                .managerPrimaryName(m.getManagerPrimary() != null ? m.getManagerPrimary().getName() : null)
                .build();
    }
}