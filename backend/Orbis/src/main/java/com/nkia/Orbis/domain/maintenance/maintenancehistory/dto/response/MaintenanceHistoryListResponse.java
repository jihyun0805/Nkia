package com.nkia.Orbis.domain.maintenance.maintenancehistory.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenancehistory.entity.MaintenanceHistory;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MaintenanceHistoryListResponse {

    private Long id;
    private Integer version;
    private String customerName;
    private String projectName;
    private String productFamilyName;
    private Long contractAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String inspectionMethod;
    private String salesRepName;
    private String managerPrimaryName;

    public static MaintenanceHistoryListResponse from(MaintenanceHistory h) {
        String customerName = h.getProject() != null && h.getProject().getOrderReport() != null &&
                h.getProject().getOrderReport().getFinalCustomerCompany() != null ?
                h.getProject().getOrderReport().getFinalCustomerCompany().getName() : "-";

        return MaintenanceHistoryListResponse.builder()
                .id(h.getId())
                .version(h.getVersion())
                .customerName(customerName)
                .projectName(h.getProject() != null ? h.getProject().getPjtName() : "-")
                .productFamilyName(h.getProductFamily() != null ? h.getProductFamily().name() : null)
                .contractAmount(h.getContractAmount())
                .startDate(h.getStartDate())
                .endDate(h.getEndDate())
                .inspectionMethod(h.getInspectionCycle() != null ? h.getInspectionCycle().getDescription() : null)
                .salesRepName(h.getSalesRepName())
                .managerPrimaryName(h.getManagerPrimaryName())
                .build();
    }
}
