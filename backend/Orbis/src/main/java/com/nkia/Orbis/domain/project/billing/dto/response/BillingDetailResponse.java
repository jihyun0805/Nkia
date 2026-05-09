package com.nkia.Orbis.domain.project.billing.dto.response;

import com.nkia.Orbis.domain.project.billing.entity.Billing;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BillingDetailResponse {

    private Long id;

    private Long billingAmount;

    private LocalDate requestedIssueDate;

    private LocalDate issuedAt;

    private LocalDate collectedAt;

    private String remarks;

    private Long invoiceImageId;

    private String statusDescription;

    public static BillingDetailResponse from(Billing billing) {
        return BillingDetailResponse.builder()
                .id(billing.getId())
                .billingAmount(billing.getBillingAmount())
                .requestedIssueDate(billing.getRequestedIssueDate())
                .issuedAt(billing.getIssuedAt())
                .collectedAt(billing.getCollectedAt())
                .remarks(billing.getRemarks())
                .invoiceImageId(billing.getInvoiceImageId())
                .statusDescription(billing.getStatus().getDescription())
                .build();
    }
}