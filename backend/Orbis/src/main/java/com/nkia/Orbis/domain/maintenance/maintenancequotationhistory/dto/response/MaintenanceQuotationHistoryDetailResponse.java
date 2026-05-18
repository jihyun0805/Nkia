package com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity.MaintenanceAmountReasonHistory;
import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity.MaintenancePackageCostHistory;
import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity.MaintenanceQuotationCoverHistory;
import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity.MaintenanceQuotationHistory;
import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity.MaintenanceServiceInfoHistory;
import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MaintenanceQuotationHistoryDetailResponse {
    private Long id;
    private Integer version;
    private String companyName;
    private String projectName;
    private String refNo;
    private LocalDate quotationDate;
    private String paymentTerms;
    private Long totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long monthlySupplyPrice;
    private Long totalQuotationAmount;
    private String specialNotes;

    private CoverInfoHistoryResponse coverInfo;
    private List<PackageCostHistoryResponse> packageCosts;
    private List<ServiceInfoHistoryResponse> serviceInfos;
    private List<AmountReasonHistoryResponse> amountReasons;

    public static MaintenanceQuotationHistoryDetailResponse from(MaintenanceQuotationHistory entity) {
        return MaintenanceQuotationHistoryDetailResponse.builder()
                .id(entity.getId())
                .version(entity.getVersion())
                .companyName(entity.getProject() != null && entity.getProject().getOrderReport() != null && entity.getProject().getOrderReport().getFinalCustomerCompany() != null ? entity.getProject().getOrderReport().getFinalCustomerCompany().getName() : null)
                .projectName(entity.getProject() != null ? entity.getProject().getPjtName() : null)
                .refNo(entity.getRefNo())
                .quotationDate(entity.getQuotationDate())
                .paymentTerms(entity.getPaymentTerms())
                .totalAmount(entity.getTotalAmount())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .monthlySupplyPrice(entity.getMonthlySupplyPrice())
                .totalQuotationAmount(entity.getTotalQuotationAmount())
                .specialNotes(entity.getSpecialNotes())
                .coverInfo(entity.getCover() != null ? CoverInfoHistoryResponse.from(entity.getCover()) : null)
                .packageCosts(entity.getPackageCosts().stream().map(PackageCostHistoryResponse::from).toList())
                .serviceInfos(entity.getServiceInfos().stream().map(ServiceInfoHistoryResponse::from).toList())
                .amountReasons(entity.getAmountReasons().stream().map(AmountReasonHistoryResponse::from).toList())
                .build();
    }

    @Getter
    @Builder
    public static class CoverInfoHistoryResponse {
        private String customerName;
        private String projectName;
        private String proposalType;
        private String productFamily;
        private Long totalQuotationAmount;
        private LocalDate quotationDate;
        private String salesRepresentative;

        public static CoverInfoHistoryResponse from(MaintenanceQuotationCoverHistory entity) {
            String customerName = null;
            if (entity.getHistory().getProject() != null &&
                entity.getHistory().getProject().getOrderReport() != null &&
                entity.getHistory().getProject().getOrderReport().getFinalCustomerCompany() != null) {
                customerName = entity.getHistory().getProject().getOrderReport().getFinalCustomerCompany().getName();
            }

            return CoverInfoHistoryResponse.builder()
                    .customerName(customerName)
                    .projectName(entity.getHistory().getProject().getPjtName())
                    .proposalType(entity.getProposalType() != null ? entity.getProposalType().getDescription() : null)
                    .productFamily(entity.getProductFamily() != null ? entity.getProductFamily().getDescription() : null)
                    .totalQuotationAmount(entity.getHistory().getTotalQuotationAmount())
                    .quotationDate(entity.getHistory().getQuotationDate())
                    .salesRepresentative(entity.getSalesRepresentativeName())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class PackageCostHistoryResponse {
        private String packageName;
        private Long amount;

        public static PackageCostHistoryResponse from(MaintenancePackageCostHistory entity) {
            return PackageCostHistoryResponse.builder()
                    .packageName(entity.getPackageName())
                    .amount(entity.getAmount())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class ServiceInfoHistoryResponse {
        private Long productId;
        private String productName;
        private String category;
        private String item;
        private String content;

        public static ServiceInfoHistoryResponse from(MaintenanceServiceInfoHistory entity) {
            return ServiceInfoHistoryResponse.builder()
                    .productId(entity.getProductModule() != null ? entity.getProductModule().getId() : null)
                    .productName(entity.getProductModule() != null ? entity.getProductModule().getProductName() : "N/A")
                    .category(entity.getCategory() != null ? entity.getCategory().getDescription() : null)
                    .item(entity.getItem() != null ? entity.getItem().getDescription() : null)
                    .content(entity.getContent())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class AmountReasonHistoryResponse {
        private Long productId;
        private String productCategory;
        private String productName;
        private Integer quantity;
        private Long amount;
        private Integer months;
        private String remarks;

        public static AmountReasonHistoryResponse from(MaintenanceAmountReasonHistory entity) {
            return AmountReasonHistoryResponse.builder()
                    .productId(entity.getProductModule() != null ? entity.getProductModule().getId() : null)
                    .productCategory(entity.getProductModule() != null ? entity.getProductModule().getProductGroup() : null)
                    .productName(entity.getProductModule() != null ? entity.getProductModule().getProductName() : "N/A")
                    .quantity(entity.getQuantity())
                    .amount(entity.getAmount())
                    .months(entity.getMonths())
                    .remarks(entity.getRemarks())
                    .build();
        }
    }
}
