package com.nkia.Orbis.domain.maintenance.maintenance.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

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

    public static MaintenanceListResponse from(Maintenance m) {
        return MaintenanceListResponse.builder()
                .customerName(m.getProject().getOrderReport().getFinalCustomerCompany().getName())
                .projectName(m.getProject().getPjtName())
                .productFamilyName(m.getProductFamily().name())
                .contractAmount(m.getContractAmount())
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .inspectionMethod(m.getInspectionCycle() != null ? m.getInspectionCycle().getDescription() : null)
                .salesRepName(m.getSalesRep().getName())
                .managerPrimaryName(m.getManagerPrimary() != null ? m.getManagerPrimary().getName() : null)
                .build();
    }
}