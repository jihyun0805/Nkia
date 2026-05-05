package com.nkia.Orbis.domain.project.billing.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BillingCreateRequest {
    @NotNull(message = "수주보고서 ID는 필수입니다.")
    private Long orderReportId;

    @NotNull(message = "청구 금액은 필수입니다.")
    private Long billingAmount;

    @NotNull(message = "세금계산서 발행 희망일은 필수입니다.")
    private LocalDate requestedIssueDate;

    private String remarks;
}
