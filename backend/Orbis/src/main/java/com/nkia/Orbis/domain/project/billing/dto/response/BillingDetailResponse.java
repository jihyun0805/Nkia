package com.nkia.Orbis.domain.project.billing.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BillingDetailResponse {

    private Long id;

    private Long workflowId;

    private ApprovalStatus approvalStatus;

    private Long orderReportId;

    private String customerName;

    private String projectName;

    private Long billingAmount;

    private LocalDate requestedIssueDate;

    private LocalDate issuedAt;

    private LocalDate collectedAt;

    private String remarks;

    private Long invoiceImageId;

    private String status;

    private String createdBy;

    private LocalDateTime createdAt;

    public static BillingDetailResponse from(Billing billing, Long workflowId, String createdByName) {
        return BillingDetailResponse.builder()
                .id(billing.getId())
                .workflowId(workflowId)
                .approvalStatus(billing.getApprovalStatus())
                .orderReportId(billing.getOrderReport() != null ? billing.getOrderReport().getId() : null)
                .customerName(billing.getOrderReport() != null && billing.getOrderReport().getFinalCustomerCompany() != null
                        ? billing.getOrderReport().getFinalCustomerCompany().getName() : null)
                .projectName(billing.getOrderReport() != null && billing.getOrderReport().getProjectOpportunity() != null
                        ? billing.getOrderReport().getProjectOpportunity().getOpportunityName() : null)
                .billingAmount(billing.getBillingAmount())
                .requestedIssueDate(billing.getRequestedIssueDate())
                .issuedAt(billing.getIssuedAt())
                .collectedAt(billing.getCollectedAt())
                .remarks(billing.getRemarks())
                .invoiceImageId(billing.getInvoiceImageId())
                .status(billing.getStatus().name())
                .createdBy(createdByName)
                .createdAt(billing.getCreatedAt())
                .build();
    }
}