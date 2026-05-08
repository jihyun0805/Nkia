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

    private String projectOpportunityName;

    private Long companyId;

    private String companyName;

    private ActivityType activityType;

    private ActivityPurpose activityPurpose;

    private LocalDateTime activityDateTime;

    private ActivityStatus status;

    private Long salesActivityRequestId;

    private String salesActivityRequestTitle;

    public static SalesActivityListResponse from(SalesActivity salesActivity) {
        return SalesActivityListResponse.builder()
                .id(salesActivity.getId())
                .projectOpportunityId(salesActivity.getProjectOpportunity().getId())
                .projectOpportunityName(salesActivity.getProjectOpportunity().getOpportunityName())
                .companyId(salesActivity.getProjectOpportunity().getCustomerCompany().getId())
                .companyName(salesActivity.getProjectOpportunity().getCustomerCompany().getName())
                .activityType(salesActivity.getActivityType())
                .activityPurpose(salesActivity.getActivityPurpose())
                .activityDateTime(salesActivity.getActivityDateTime())
                .status(salesActivity.getStatus())
                .salesActivityRequestId(
                        salesActivity.getSalesActivityRequest() != null
                                ? salesActivity.getSalesActivityRequest().getId()
                                : null
                )
                .salesActivityRequestTitle(
                        salesActivity.getSalesActivityRequest() != null
                                ? salesActivity.getSalesActivityRequest().getTitle()
                                : null
                )
                .build();
    }
}
