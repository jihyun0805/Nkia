package com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response;

import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequestHistory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerSupportRequestHistoryListResponse {
    
    private Long historyId;
    private Long originalRequestId;
    private String customerName;
    private LocalDate requestStartDate;
    private LocalDate requestEndDate;
    private String requesterName;
    private String salesRepName;
    private String supportManagerName;
    private LocalDateTime savedAt;

    public static CustomerSupportRequestHistoryListResponse from(CustomerSupportRequestHistory history) {
        return CustomerSupportRequestHistoryListResponse.builder()
                .historyId(history.getId())
                .originalRequestId(history.getOriginalRequestId())
                .customerName(history.getCustomerName())
                .requestStartDate(history.getRequestStartDate())
                .requestEndDate(history.getRequestEndDate())
                .requesterName(history.getRequesterName())
                .salesRepName(history.getSalesRepName())
                .supportManagerName(history.getSupportManagerName())
                .savedAt(history.getCreatedAt())
                .build();
    }
}
