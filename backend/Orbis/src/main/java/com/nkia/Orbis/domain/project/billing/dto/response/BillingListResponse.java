package com.nkia.Orbis.domain.project.billing.dto.response;

import com.nkia.Orbis.domain.project.billing.entity.Billing;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BillingListResponse {

    private String customerName;

    private String projectName;

    private Long billingAmount;

    private LocalDate issuedAt;

    private LocalDate collectedAt;

    private String salesRepName;

    private String requesterName;

    public static BillingListResponse from(Billing billing, String requesterName) {
        return BillingListResponse.builder()
                .customerName(billing.getOrderReport().getFinalCustomerCompany().getName())
                .projectName(billing.getOrderReport().getProjectOpportunity().getOpportunityName())
                .billingAmount(billing.getBillingAmount())
                .issuedAt(billing.getIssuedAt())
                .collectedAt(billing.getCollectedAt())
                .salesRepName(billing.getOrderReport().getPm().getName())
                .requesterName(requesterName)
                .build();
    }
}
