package com.nkia.Orbis.domain.project.billing.dto.response;

import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.billing.entity.BillingStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BillingListResponse {

    private Long id;
    
    private BillingStatus status;
    
    private LocalDateTime createdAt;

    private String customerName;

    private String projectName;

    private Long billingAmount;

    private LocalDate issuedAt;

    private LocalDate collectedAt;

    private String salesRepName;

    private String requesterName;

    public static BillingListResponse from(Billing billing, String requesterName) {
        return BillingListResponse.builder()
                .id(billing.getId())
                .status(billing.getStatus())
                .createdAt(billing.getCreatedAt())
                .customerName(billing.getOrderReport() != null && billing.getOrderReport().getFinalCustomerCompany() != null
                        ? billing.getOrderReport().getFinalCustomerCompany().getName() : null)
                .projectName(billing.getOrderReport() != null && billing.getOrderReport().getProjectOpportunity() != null
                        ? billing.getOrderReport().getProjectOpportunity().getOpportunityName() : null)
                .billingAmount(billing.getBillingAmount())
                .issuedAt(billing.getIssuedAt())
                .collectedAt(billing.getCollectedAt())
                .salesRepName(billing.getOrderReport() != null && billing.getOrderReport().getPm() != null
                        ? billing.getOrderReport().getPm().getName() : null)
                .requesterName(requesterName)
                .build();
    }
}
