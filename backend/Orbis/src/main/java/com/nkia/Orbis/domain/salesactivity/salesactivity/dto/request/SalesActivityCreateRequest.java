package com.nkia.Orbis.domain.salesactivity.salesactivity.dto.request;

import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.ActivityStatus;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.ActivityType;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;

@Getter
public class SalesActivityCreateRequest {

    private Long projectOpportunity;

    private ActivityType activityType;

    private ActivityPurpose activityPurpose;

    private String activityContent;

    private String location;

    private LocalDateTime activityDateTime;

    private String issue;

    private String nextActivity;

    private List<Long> attendees;

    private String customerInterest;

    private ActivityStatus status;
}
