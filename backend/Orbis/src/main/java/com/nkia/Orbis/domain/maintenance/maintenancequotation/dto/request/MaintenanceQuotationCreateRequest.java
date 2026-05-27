package com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.ProductFamily;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.ProposalType;

@Getter
@NoArgsConstructor
public class MaintenanceQuotationCreateRequest {

    @NotNull(message = "프로젝트 ID는 필수입니다")
    private Long projectId;

    @NotNull(message = "견적 일자는 필수입니다")
    private LocalDate quotationDate;

    @NotBlank(message = "대금결제조건은 필수입니다")
    private String paymentTerms;

    @NotNull(message = "총 금액은 필수입니다")
    @PositiveOrZero(message = "총 금액은 0 이상이어야 합니다")
    private Long totalAmount;

    @NotNull(message = "시작 일자는 필수입니다")
    private LocalDate startDate;

    @NotNull(message = "종료 일자는 필수입니다")
    private LocalDate endDate;

    @NotNull(message = "월 공급가는 필수입니다")
    @PositiveOrZero(message = "월 공급가는 0 이상이어야 합니다")
    private Long monthlySupplyPrice;

    @NotNull(message = "총 견적 금액은 필수입니다")
    @PositiveOrZero(message = "총 견적 금액은 0 이상이어야 합니다")
    private Long totalQuotationAmount;

    private String specialNotes;

    @Valid
    private CoverInfoRequest coverInfo;

    @Valid
    private List<PackageCostRequest> packageCosts;

    @Valid
    private List<ServiceInfoRequest> serviceInfos;

    @Valid
    private List<AmountReasonRequest> amountReasons;

    @Getter
    @NoArgsConstructor
    public static class CoverInfoRequest {
        @NotNull(message = "영업대표 정보는 필수입니다")
        private UUID salesRepresentativeId;

        @NotNull(message = "제안 유형은 필수입니다")
        private ProposalType proposalType;

        @NotNull(message = "제품군은 필수입니다")
        private ProductFamily productFamily;
    }

    @Getter
    @NoArgsConstructor
    public static class PackageCostRequest {
        @NotBlank(message = "패키지 구분은 필수입니다")
        private String packageName;

        @NotNull(message = "비용은 필수입니다")
        @PositiveOrZero(message = "비용은 0 이상이어야 합니다")
        private Long amount;
    }

    @Getter
    @NoArgsConstructor
    public static class ServiceInfoRequest {

        private Long productId;

        @NotBlank(message = "서비스 구분은 필수입니다")
        private String category;

        @NotBlank(message = "서비스 항목은 필수입니다")
        private String item;

        @NotBlank(message = "서비스 내용은 필수입니다")
        private String content;
    }

    @Getter
    @NoArgsConstructor
    public static class AmountReasonRequest {

        private Long productId;

        @NotNull(message = "수량은 필수입니다")
        private Integer quantity;

        @NotNull(message = "금액은 필수입니다")
        @PositiveOrZero(message = "금액은 0 이상이어야 합니다")
        private Long amount;

        @NotNull(message = "개월수는 필수입니다")
        private Integer months;

        private String remarks;
    }
}