package com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response;

import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupportHistory;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerSupportHistoryDetailResponse {
    
    private Long historyId;
    private Long originalActivityId;
    private String customerName;
    private String activityType;
    private LocalDateTime activityStartTime;
    private LocalDateTime activityEndTime;
    private String activityContent;
    private String registrantName;
    private String remarks;
    private String participantsInfo;
    private LocalDateTime savedAt;

    public static CustomerSupportHistoryDetailResponse from(CustomerSupportHistory history) {
        return CustomerSupportHistoryDetailResponse.builder()
                .historyId(history.getId())
                .originalActivityId(history.getOriginalActivityId())
                .customerName(history.getCustomerName())
                .activityType(history.getActivityType())
                .activityStartTime(history.getActivityStartTime())
                .activityEndTime(history.getActivityEndTime())
                .activityContent(history.getActivityContent())
                .registrantName(history.getRegistrantName())
                .remarks(history.getRemarks())
                .participantsInfo(history.getParticipantsInfo())
                .savedAt(history.getCreatedAt())
                .build();
    }
}
