package com.nkia.Orbis.domain.activity.salesactivity.dto.request;

import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityStatus;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Getter;

@Getter
public class SalesActivityCreateRequest {

    private Long projectOpportunityId;

    private ActivityType activityType;

    private ActivityPurpose activityPurpose;

    private String activityContent;

    private String location;

    private LocalDateTime activityDateTime;

    private String issue;

    private String nextActivity;

    private List<UUID> attendeeUserIds;

    private String customerInterest;

    private ActivityStatus status;

    private Long salesActivityRequestId;
}
