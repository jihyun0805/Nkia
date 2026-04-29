package com.nkia.Orbis.domain.salesactivity.salesactivityrequest.dto.request;

import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.ActivityPurpose;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;

@Getter
public class SalesActivityRequestCreateRequest {

    UUID targetUserId;

    ActivityPurpose activityPurpose;

    LocalDateTime activityDateTime;

    String requestContent;


}
