package com.nkia.Orbis.domain.project.billing.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BillingIssueRequest {
    @NotNull(message = "실제 세금계산서 발행일은 필수입니다.")
    private LocalDate issuedAt;

    private Long invoiceImageId;
}
