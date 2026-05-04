package com.nkia.Orbis.domain.activity.salesactivityrequest.dto.request;

import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityType;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;

@Getter
public class SalesActivityRequestCreateRequest {

    private UUID targetUserId;

    private ActivityPurpose activityPurpose;

    private ActivityType activityType;

    private LocalDateTime activityDateTime;

    private String requestContent;


}
