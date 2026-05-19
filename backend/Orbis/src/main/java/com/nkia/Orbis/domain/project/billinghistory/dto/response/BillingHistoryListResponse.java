package com.nkia.Orbis.domain.project.billinghistory.dto.response;

import com.nkia.Orbis.domain.project.billing.entity.BillingStatus;
import com.nkia.Orbis.domain.project.billinghistory.entity.BillingHistory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BillingHistoryListResponse {
    
    private Long id;
    
    private Long originalBillingId;

    private String customerName;

    private String projectName;

    private Long billingAmount;

    private LocalDate issuedAt;

    private LocalDate collectedAt;

    private String salesRepName;

    private String requesterName;
    
    private LocalDateTime createdAt;

    private BillingStatus status;

    public static BillingHistoryListResponse from(BillingHistory history) {
        return BillingHistoryListResponse.builder()
                .id(history.getId())
                .originalBillingId(history.getOriginalBillingId())
                .customerName(history.getCustomerName())
                .projectName(history.getProjectName())
                .billingAmount(history.getBillingAmount())
                .issuedAt(history.getIssuedAt())
                .collectedAt(history.getCollectedAt())
                .salesRepName(history.getSalesRepName())
                .requesterName(history.getRequesterName())
                .createdAt(history.getCreatedAt())
                .status(history.getStatus())
                .build();
    }
}
