package com.nkia.Orbis.domain.project.billinghistory.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.project.billinghistory.entity.BillingHistory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BillingHistoryDetailResponse {

    private Long id;

    private Long originalBillingId;

    private ApprovalStatus approvalStatus;

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

    public static BillingHistoryDetailResponse from(BillingHistory history) {
        return BillingHistoryDetailResponse.builder()
                .id(history.getId())
                .originalBillingId(history.getOriginalBillingId())
                .approvalStatus(history.getApprovalStatus())
                .customerName(history.getCustomerName())
                .projectName(history.getProjectName())
                .billingAmount(history.getBillingAmount())
                .requestedIssueDate(history.getRequestedIssueDate())
                .issuedAt(history.getIssuedAt())
                .collectedAt(history.getCollectedAt())
                .remarks(history.getRemarks())
                .invoiceImageId(history.getInvoiceImageId())
                .status(history.getStatus() != null ? history.getStatus().name() : null)
                .createdBy(history.getRequesterName())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
