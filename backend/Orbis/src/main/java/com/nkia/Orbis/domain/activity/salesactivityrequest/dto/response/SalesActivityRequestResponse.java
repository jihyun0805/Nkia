package com.nkia.Orbis.domain.activity.salesactivityrequest.dto.response;

import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityType;
import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesActivityRequestResponse {

    private Long id;

    private String title;

    private Long salesActivityId;

    private UUID targetUserId;

    private String targetUserName;

    private UUID requestUserId;

    private String requestUserName;

    private ActivityPurpose activityPurpose;

    private ActivityType activityType;

    private LocalDateTime activityDateTime;

    private String requestContent;

    public static SalesActivityRequestResponse from(
            SalesActivityRequest salesActivityRequest
    ) {
        return SalesActivityRequestResponse.builder()
                .id(salesActivityRequest.getId())
                .title(salesActivityRequest.getTitle())
                .salesActivityId(
                        salesActivityRequest.getSalesActivity() != null ? salesActivityRequest.getSalesActivity()
                                .getId() : null
                )
                .targetUserId(salesActivityRequest.getTargetUser().getId())
                .targetUserName(salesActivityRequest.getTargetUser().getName())
                .requestUserId(salesActivityRequest.getRequestUser().getId())
                .requestUserName(salesActivityRequest.getRequestUser().getName())
                .activityPurpose(salesActivityRequest.getActivityPurpose())
                .activityType(salesActivityRequest.getActivityType())
                .activityDateTime(salesActivityRequest.getActivityDateTime())
                .requestContent(salesActivityRequest.getRequestContent())
                .build();
    }
}
