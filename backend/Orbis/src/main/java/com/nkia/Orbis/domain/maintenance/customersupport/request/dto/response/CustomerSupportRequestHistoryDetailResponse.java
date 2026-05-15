package com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequestHistory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerSupportRequestHistoryDetailResponse {
    
    private Long historyId;
    private Long originalRequestId;
    private ApprovalStatus status;
    private String customerName;
    private LocalDate requestStartDate;
    private LocalDate requestEndDate;
    private String requestContent;
    private String requesterName;
    private String supportManagerName;
    private String registrantName;
    private String salesRepName;
    private String remarks;
    private LocalDateTime savedAt;

    public static CustomerSupportRequestHistoryDetailResponse from(CustomerSupportRequestHistory history) {
        return CustomerSupportRequestHistoryDetailResponse.builder()
                .historyId(history.getId())
                .originalRequestId(history.getOriginalRequestId())
                .status(history.getStatus())
                .customerName(history.getCustomerName())
                .requestStartDate(history.getRequestStartDate())
                .requestEndDate(history.getRequestEndDate())
                .requestContent(history.getRequestContent())
                .requesterName(history.getRequesterName())
                .supportManagerName(history.getSupportManagerName())
                .registrantName(history.getRegistrantName())
                .salesRepName(history.getSalesRepName())
                .remarks(history.getRemarks())
                .savedAt(history.getCreatedAt())
                .build();
    }
}
