package com.nkia.Orbis.domain.activity.salesactivityrequest.dto.request;

import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;

@Getter
public class SalesActivityRequestCreateRequest {

    UUID targetUserId;

    Long salesActivityId;

    ActivityPurpose activityPurpose;

    LocalDateTime activityDateTime;

    String requestContent;


}
