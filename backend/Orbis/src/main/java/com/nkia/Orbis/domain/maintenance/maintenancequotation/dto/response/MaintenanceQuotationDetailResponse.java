package com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MaintenanceQuotationDetailResponse {

    private Long id;
    private String refNo;
    private LocalDate quotationDate;
    private String paymentTerms;
    private Long totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long monthlySupplyPrice;
    private Long totalQuotationAmount;
    private String specialNotes;

    private List<PackageCostResponse> packageCosts;
    private List<ServiceInfoResponse> serviceInfos;
    private List<AmountReasonResponse> amountReasons;

    public static MaintenanceQuotationDetailResponse from(MaintenanceQuotation entity) {
        return MaintenanceQuotationDetailResponse.builder()
                .id(entity.getId())
                .refNo(entity.getRefNo())
                .quotationDate(entity.getQuotationDate())
                .paymentTerms(entity.getPaymentTerms())
                .totalAmount(entity.getTotalAmount())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .monthlySupplyPrice(entity.getMonthlySupplyPrice())
                .totalQuotationAmount(entity.getTotalQuotationAmount())
                .specialNotes(entity.getSpecialNotes())
                .packageCosts(entity.getPackageCosts().stream()
                        .map(PackageCostResponse::from)
                        .collect(Collectors.toList()))
                .serviceInfos(entity.getServiceInfos().stream()
                        .map(ServiceInfoResponse::from)
                        .collect(Collectors.toList()))
                .amountReasons(entity.getAmountReasons().stream()
                        .map(AmountReasonResponse::from)
                        .collect(Collectors.toList()))
                .build();
    }

    @Getter
    @Builder
    public static class PackageCostResponse {
        private String packageName;
        private Long amount;

        public static PackageCostResponse from(com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenancePackageCost entity) {
            return PackageCostResponse.builder()
                    .packageName(entity.getPackageName())
                    .amount(entity.getAmount())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class ServiceInfoResponse {
        private Long productId;
        private String productName;
        private String category;
        private String item;
        private String content;

        public static ServiceInfoResponse from(com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceServiceInfo entity) {
            return ServiceInfoResponse.builder()
                    .productId(entity.getProductModule() != null ? entity.getProductModule().getId() : null)
                    .productName(entity.getProductModule() != null ? entity.getProductModule().getProductName() : "N/A")
                    .category(entity.getCategory().getDescription())
                    .item(entity.getItem().getDescription())
                    .content(entity.getContent())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class AmountReasonResponse {
        private Long productId;
        private String productName;
        private Integer quantity;
        private Long amount;
        private Integer months;
        private String remarks;

        public static AmountReasonResponse from(com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceAmountReason entity) {
            return AmountReasonResponse.builder()
                    .productId(entity.getProductModule() != null ? entity.getProductModule().getId() : null)
                    .productName(entity.getProductModule() != null ? entity.getProductModule().getProductName() : "N/A")
                    .quantity(entity.getQuantity())
                    .amount(entity.getAmount())
                    .months(entity.getMonths())
                    .remarks(entity.getRemarks())
                    .build();
        }
    }
}
