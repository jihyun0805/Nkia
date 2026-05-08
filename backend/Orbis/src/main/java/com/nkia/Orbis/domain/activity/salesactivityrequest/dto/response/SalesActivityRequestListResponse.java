package com.nkia.Orbis.domain.activity.salesactivityrequest.dto.response;

import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesActivityRequestListResponse {
    private Long id;

    private String title;

    private Long salesActivityId;

    private UUID targetUserId;

    private ActivityPurpose activityPurpose;

    private LocalDateTime activityDateTime;


    public static SalesActivityRequestListResponse from(
            SalesActivityRequest salesActivityRequest) {
        return SalesActivityRequestListResponse.builder()
                .id(salesActivityRequest.getId())
                .title(salesActivityRequest.getTitle())
                .salesActivityId(
                        salesActivityRequest.getSalesActivity() != null ? salesActivityRequest.getSalesActivity()
                                .getId() : null
                )
                .targetUserId(salesActivityRequest.getTargetUser().getId())
                .activityPurpose(salesActivityRequest.getActivityPurpose())
                .activityDateTime(salesActivityRequest.getActivityDateTime())
                .build();
    }
}