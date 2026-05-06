package com.nkia.Orbis.domain.activity.salesactivity.dto.response;

import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityStatus;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityType;
import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesActivityListResponse {
    private Long id;

    private Long projectOpportunityId;

    private ActivityType activityType;

    private ActivityPurpose activityPurpose;

    private LocalDateTime activityDateTime;

    private ActivityStatus status;

    private Long salesActivityRequestId;

    public static SalesActivityListResponse from(SalesActivity salesActivity) {
        return SalesActivityListResponse.builder()
                .id(salesActivity.getId())
                .projectOpportunityId(
                        salesActivity.getProjectOpportunity() != null
                                ? salesActivity.getProjectOpportunity().getId()
                                : null
                )
                .activityType(salesActivity.getActivityType())
                .activityPurpose(salesActivity.getActivityPurpose())
                .activityDateTime(salesActivity.getActivityDateTime())
                .status(salesActivity.getStatus())
                .salesActivityRequestId(
                        salesActivity.getSalesActivityRequest() != null
                                ? salesActivity.getSalesActivityRequest().getId()
                                : null
                )
                .build();
    }
}
