package com.nkia.Orbis.domain.activity.salesactivity.dto.response;

import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesActivityResponse {
    private Long id;

    private Long projectOpportunityId;

    private String projectOpportunityName;

    private Long companyId;

    private String companyName;

    private String activityType;

    private String activityPurpose;

    private String activityContent;

    private String location;

    private LocalDateTime activityDateTime;

    private String issue;

    private String nextActivity;

    private String customerInterest;

    private String status;

    private Long salesActivityRequestId;

    private String salesActivityRequestTitle;

    public static SalesActivityResponse from(SalesActivity salesActivity) {
        return SalesActivityResponse.builder()
                .id(salesActivity.getId())
                .projectOpportunityId(salesActivity.getProjectOpportunity().getId())
                .projectOpportunityName(salesActivity.getProjectOpportunity().getOpportunityName())
                .companyId(salesActivity.getProjectOpportunity().getCustomerCompany().getId())
                .companyName(salesActivity.getProjectOpportunity().getCustomerCompany().getName())
                .activityType(salesActivity.getActivityType().getDescription())
                .activityPurpose(salesActivity.getActivityPurpose().getDescription())
                .activityContent(salesActivity.getActivityContent())
                .location(salesActivity.getLocation())
                .activityDateTime(salesActivity.getActivityDateTime())
                .issue(salesActivity.getIssue())
                .nextActivity(salesActivity.getNextActivity())
                .customerInterest(salesActivity.getCustomerInterest())
                .status(salesActivity.getStatus().getDescription())
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
