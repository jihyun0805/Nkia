package com.nkia.Orbis.domain.contract.orderreporthistory.dto.response;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportHistory;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportHistoryResponse {

    private Long id;

    private LocalDateTime orderReportDate;

    private Integer version;

    private String orderReportCode;

    private Long totalAmount;

    private String paymentCondition;

    private boolean quotationProvided;

    private boolean contractProvided;

    private boolean purchaseOrderProvided;

    private boolean prbReportProvided;

    private String additionalDocuments;

    private String type;

    private boolean channel;

    private String codeType;

    private LocalDate contractDate;

    private Integer freeMaintenancePeriodMonths;

    private LocalDate contractStartDate;

    private LocalDate contractEndDate;

    private Integer contractPeriodMonths;

    private String scopeOfWork;

    private String remarks;

    // TODO: 사업 기회 구현 후 형식에 맞게 반환(사업명)
    private ProjectOpportunity projectOpportunity;

    private UUID pmId;

    private String pmName;

    private Long contractCounterpartCompanyId;

    private String contractCounterpartCompanyName;

    private Long contractCounterpartManagerId;

    private String contractCounterpartManagerName;

    private Long finalCustomerCompanyId;

    private String finalCustomerCompanyName;

    private Long finalCustomerManagerId;

    private String finalCustomerManagerName;

    private List<OrderReportMaintenanceHistoryResponse> maintenances;

    private List<OrderReportLicenseHistoryResponse> licenses;

    private List<OrderReportServiceHistoryResponse> services;

    private List<OrderReportMaintenanceOnlyItemHistoryResponse> maintenanceOnlyItems;

    private List<OrderReportOtherHistoryResponse> others;

    private List<OrderReportPurchaseHistoryResponse> purchases;

    private Long itemTotalAmount;

    private Long itemTotalLicense;

    private Long itemTotalThirdParty;

    private Long itemTotalService;

    private Long itemTotalMaintenance;

    private Double itemTotalMaintenanceRate;

    // OrderReportLicense totalPrice들의 총합
    private Long licenseTotal;

    // OrderReportService totalPrice들의 총합
    private Long serviceTotal;

    // OrderReportMaintenance totalPrice들의 총합
    private Long maintenanceTotal;

    // OrderReportOther totalPrice들의 총합
    private Long otherTotal;

    // Purchase totalPrice들의 총합
    private Long purchaseTotal;

    // OrderReportLicense 중 ProductClass가 EMS인 것들의 totalPrice들의 총합
    private Long emsSummary;

    // OrderReportLicense 중 ProductClass가 ITSM인 것들의 totalPrice들의 총합
    private Long itgSummary;

    // OrderReportLicense 중 ProductClass가 DASHBOARD인 것들의 totalPrice들의 총합
    private Long dashboardSummary;

    // OrderReportLicense 중 ProductClass가 DATACENTER, RCA, DCA인 것들의 totalPrice들의 총합
    private Long aiotionSummary;

    private Long emsMaintenanceSummary;

    private Long itgMaintenanceSummary;

    // OrderReportLicense 중 ProductClass가 ITAM인 것들의 totalPrice들의 총합
    private Long itoSummary;

    // OrderReportLicense 중 ProductClass가 앞의 분류에 해당하지 않는것들의 totalPrice들의 총합
    private Long otherSummary;

    // Todo: Company, CompanyManager 구현후 연동 예정
    public static OrderReportHistoryResponse from(OrderReportHistory orderReport) {
        return OrderReportHistoryResponse.builder()
                .id(orderReport.getId())
                .orderReportDate(orderReport.getOrderReportDate())
                .version(orderReport.getVersion())
                .orderReportCode(orderReport.getOrderReportCode())
                .totalAmount(orderReport.getTotalAmount())
                .paymentCondition(orderReport.getPaymentCondition())
                .quotationProvided(orderReport.isQuotationProvided())
                .contractProvided(orderReport.isContractProvided())
                .purchaseOrderProvided(orderReport.isPurchaseOrderProvided())
                .prbReportProvided(orderReport.isPrbReportProvided())
                .additionalDocuments(orderReport.getAdditionalDocuments())
                .type(orderReport.getType().getDescription())
                .channel(orderReport.isChannel())
                .codeType(orderReport.getCodeType().getDescription())
                .contractDate(orderReport.getContractDate())
                .freeMaintenancePeriodMonths(orderReport.getFreeMaintenancePeriodMonths())
                .contractStartDate(orderReport.getContractStartDate())
                .contractEndDate(orderReport.getContractEndDate())
                .contractPeriodMonths(orderReport.getContractPeriodMonths())
                .scopeOfWork(orderReport.getScopeOfWork())
                .remarks(orderReport.getRemarks())

                .projectOpportunity(orderReport.getProjectOpportunity())

                .pmId(orderReport.getPm() != null ? orderReport.getPm().getId() : null)
                .pmName(orderReport.getPm() != null ? orderReport.getPm().getName() : null)

//                .contractCounterpartCompanyId(orderReport.getContractCounterpartCompany() != null
//                        ? orderReport.getContractCounterpartCompany().getId() : null)
//                .contractCounterpartCompanyName(orderReport.getContractCounterpartCompany() != null
//                        ? orderReport.getContractCounterpartCompany().getCompanyName() : null)
//
//                .contractCounterpartManagerId(orderReport.getContractCounterpartManager() != null
//                        ? orderReport.getContractCounterpartManager().getId() : null)
//                .contractCounterpartManagerName(orderReport.getContractCounterpartManager() != null
//                        ? orderReport.getContractCounterpartManager().getName() : null)
//
//                .finalCustomerCompanyId(
//                        orderReport.getFinalCustomerCompany() != null ? orderReport.getFinalCustomerCompany().getId()
//                                : null)
//                .finalCustomerCompanyName(
//                        orderReport.getFinalCustomerCompany() != null ? orderReport.getFinalCustomerCompany()
//                                .getCompanyName() : null)
                .contractCounterpartCompanyId(null)
                .contractCounterpartCompanyName(null)

                .contractCounterpartManagerId(null)
                .contractCounterpartManagerName(null)

                .finalCustomerCompanyId(null)
                .finalCustomerCompanyName(null)

                .finalCustomerManagerId(null)
                .finalCustomerManagerName(null)

//                .finalCustomerManagerId(
//                        orderReport.getFinalCustomerManager() != null ? orderReport.getFinalCustomerManager().getId()
//                                : null)
//                .finalCustomerManagerName(
//                        orderReport.getFinalCustomerManager() != null ? orderReport.getFinalCustomerManager().getName()
//                                : null)

                .maintenances(orderReport.getMaintenances().stream()
                        .map(OrderReportMaintenanceHistoryResponse::from)
                        .toList())
                .licenses(orderReport.getLicenses().stream()
                        .map(OrderReportLicenseHistoryResponse::from)
                        .toList())
                .services(orderReport.getServices().stream()
                        .map(OrderReportServiceHistoryResponse::from)
                        .toList())
                .maintenanceOnlyItems(orderReport.getMaintenanceOnlyItems().stream()
                        .map(OrderReportMaintenanceOnlyItemHistoryResponse::from)
                        .toList())
                .others(orderReport.getOthers().stream()
                        .map(OrderReportOtherHistoryResponse::from)
                        .toList())
                .purchases(orderReport.getPurchases().stream()
                        .map(OrderReportPurchaseHistoryResponse::from)
                        .toList())

                .itemTotalAmount(orderReport.getItemTotalAmount())
                .itemTotalLicense(orderReport.getItemTotalLicense())
                .itemTotalThirdParty(orderReport.getItemTotalThirdParty())
                .itemTotalService(orderReport.getItemTotalService())
                .itemTotalMaintenance(orderReport.getItemTotalMaintenance())
                .itemTotalMaintenanceRate(orderReport.getItemTotalMaintenanceRate())

                .licenseTotal(orderReport.getLicenseTotal())
                .serviceTotal(orderReport.getServiceTotal())
                .maintenanceTotal(orderReport.getMaintenanceTotal())
                .otherTotal(orderReport.getOtherTotal())
                .purchaseTotal(orderReport.getPurchaseTotal())

                .emsSummary(orderReport.getEmsSummary())
                .itgSummary(orderReport.getItgSummary())
                .dashboardSummary(orderReport.getDashboardSummary())
                .aiotionSummary(orderReport.getAiotionSummary())
                .emsMaintenanceSummary(orderReport.getEmsMaintenanceSummary())
                .itgMaintenanceSummary(orderReport.getItgMaintenanceSummary())
                .itoSummary(orderReport.getItoSummary())
                .otherSummary(orderReport.getOtherSummary())
                .build();
    }
}
