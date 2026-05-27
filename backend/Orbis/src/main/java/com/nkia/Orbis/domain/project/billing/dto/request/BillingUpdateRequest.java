package com.nkia.Orbis.domain.project.billing.dto.request;

import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BillingUpdateRequest {

    private Long billingAmount;

    private LocalDate requestedIssueDate;

    private String remarks;

    private LocalDate issuedAt;

    private Long invoiceImageId;

    private LocalDate collectedAt;
}
