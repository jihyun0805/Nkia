package com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response;

import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupportHistory;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerSupportHistoryListResponse {
    
    private Long historyId;
    private Long originalActivityId;
    private String customerName;
    private String activityType;
    private LocalDateTime activityStartTime;
    private LocalDateTime activityEndTime;
    private String registrantName;
    private LocalDateTime savedAt;

    public static CustomerSupportHistoryListResponse from(CustomerSupportHistory history) {
        return CustomerSupportHistoryListResponse.builder()
                .historyId(history.getId())
                .originalActivityId(history.getOriginalActivityId())
                .customerName(history.getCustomerName())
                .activityType(history.getActivityType())
                .activityStartTime(history.getActivityStartTime())
                .activityEndTime(history.getActivityEndTime())
                .registrantName(history.getRegistrantName())
                .savedAt(history.getCreatedAt())
                .build();
    }
}
