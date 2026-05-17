package com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class MaintenanceQuotationUpdateRequest {
    @NotBlank(message = "대금결제조건은 필수입니다")
    private String paymentTerms;

    @NotNull(message = "총 금액은 필수입니다")
    @PositiveOrZero(message = "총 금액은 0 이상이어야 합니다")
    private Long totalAmount;

    private LocalDate startDate;
    private LocalDate endDate;

    @NotNull(message = "월 공급가는 필수입니다")
    private Long monthlySupplyPrice;

    @NotNull(message = "총 견적 금액은 필수입니다")
    private Long totalQuotationAmount;

    private String specialNotes;

    @Valid
    private MaintenanceQuotationCreateRequest.CoverInfoRequest coverInfo;

    @Valid
    private List<MaintenanceQuotationCreateRequest.PackageCostRequest> packageCosts;

    @Valid
    private List<MaintenanceQuotationCreateRequest.ServiceInfoRequest> serviceInfos;

    @Valid
    private List<MaintenanceQuotationCreateRequest.AmountReasonRequest> amountReasons;
}
