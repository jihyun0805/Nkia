package com.nkia.Orbis.domain.contract.orderreport.dto.request;

import com.nkia.Orbis.domain.contract.license.dto.request.LicenseFromOrderReportRequest;
import com.nkia.Orbis.domain.contract.orderreport.entity.CodeType;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportType;
import com.nkia.Orbis.domain.contract.purchase.dto.request.PurchaseRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Getter;

@Getter
public class OrderReportRequest {

    private OrderReportType type;
    private boolean quotationProvided;
    private boolean contractProvided;
    private boolean purchaseOrderProvided;
    private boolean prbReportProvided;
    private String paymentCondition;
    private String additionalDocuments;
    private boolean channel;
    private CodeType codeType;
    private LocalDate contractDate;
    private Integer freeMaintenancePeriodMonths;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private Integer contractPeriodMonths;
    private String scopeOfWork;
    private String remarks;
    private Long projectOpportunityId;
    private UUID pmId;
    private Long contractCounterpartManagerId;
    private Long contractCounterpartCompanyId;
    private Long finalCustomerCompanyId;
    private Long finalCustomerManagerId;
    private List<OrderReportMaintenanceRequest> maintenances;
    private List<LicenseFromOrderReportRequest> licenses;
    private List<OrderReportServiceRequest> services;
    private List<OrderReportMaintenanceOnlyItemRequest> maintenanceOnlyItems;
    private List<OrderReportOtherRequest> others;
    private List<PurchaseRequest> purchases;
    private Long emsMaintenanceSummary;
    private Long itgMaintenanceSummary;
    private Double itemTotalMaintenanceRate;
}
