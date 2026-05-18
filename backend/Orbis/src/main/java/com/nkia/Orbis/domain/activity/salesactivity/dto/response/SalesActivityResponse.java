package com.nkia.Orbis.domain.activity.salesactivity.dto.response;

import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesActivityResponse {
    private Long id;

    private UUID createdById;

    private String createdByName;

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

    private List<SalesActivityAttendeeResponse> attendees;

    public static SalesActivityResponse from(SalesActivity salesActivity, String createdByName) {
        return SalesActivityResponse.builder()
                .id(salesActivity.getId())
                .createdById(UUID.fromString(salesActivity.getCreatedBy()))
                .createdByName(createdByName)
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
                .attendees(
                        salesActivity.getAttendees().stream()
                                .map(attendee ->
                                        SalesActivityAttendeeResponse.builder()
                                                .userId(attendee.getUser().getId())
                                                .userName(attendee.getUser().getName())
                                                .build()
                                )
                                .toList()
                )
                .build();
    }
}
