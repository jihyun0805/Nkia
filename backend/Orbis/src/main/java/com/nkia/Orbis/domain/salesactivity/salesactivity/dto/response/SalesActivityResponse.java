package com.nkia.Orbis.domain.salesactivity.salesactivity.dto.response;

import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.ActivityStatus;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.ActivityType;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.SalesActivity;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesActivityResponse {
    private Long id;

    private Long projectOpportunityId;

    private ActivityType activityType;

    private ActivityPurpose activityPurpose;

    private String activityContent;

    private String location;

    private LocalDateTime activityDateTime;

    private String issue;

    private String nextActivity;

    private String customerInterest;

    private ActivityStatus status;

    private Long salesActivityRequestId;

    public static SalesActivityResponse from(SalesActivity salesActivity) {
        return SalesActivityResponse.builder()
                .id(salesActivity.getId())
                .projectOpportunityId(
                        salesActivity.getProjectOpportunity() != null
                                ? salesActivity.getProjectOpportunity().getId()
                                : null
                )
                .activityType(salesActivity.getActivityType())
                .activityPurpose(salesActivity.getActivityPurpose())
                .activityContent(salesActivity.getActivityContent())
                .location(salesActivity.getLocation())
                .activityDateTime(salesActivity.getActivityDateTime())
                .issue(salesActivity.getIssue())
                .nextActivity(salesActivity.getNextActivity())
                .customerInterest(salesActivity.getCustomerInterest())
                .status(salesActivity.getStatus())
                .salesActivityRequestId(
                        salesActivity.getSalesActivityRequest() != null
                                ? salesActivity.getSalesActivityRequest().getId()
                                : null
                )
                .build();
    }
}
