package com.nkia.Orbis.domain.contract.orderreport.dto.request;

import com.nkia.Orbis.domain.contract.orderreport.entity.CodeType;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Getter;

@Getter
public class OrderReportRequest {

    private OrderReportType type;
    private boolean channel;
    private CodeType codeType;
    private LocalDate contractDate;
    private Integer freeMaintenacePeriodMonths;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private Integer contractPeriodMonths;
    private String scopeOfWork;
    private String remarks;
    private Long projectOpportunityId;
    private UUID pmId;
    private Long contractCounterpartManagerId;
    private Long finalCustomerCompanyId;
    private Long finalCustomerManagerId;
    private List<OrderReportMaintenanceRequest> maintenances;
    private List<OrderReportLicenseRequest> licenses;
    private List<OrderReportServiceRequest> services;
    private List<OrderReportMaintenanceOnlyItemRequest> maintenanceOnlyItems;
    private List<OrderReportOtherRequest> others;
    private List<OrderReportPurchaseRequest> purchases;
    private Long emsMaintenanceSummary;
    private Long itgMaintenanceSummary;
}
