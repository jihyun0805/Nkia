package com.nkia.Orbis.domain.activity.salesactivityrequest.dto.request;

import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityType;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;

@Getter
public class SalesActivityRequestCreateRequest {

    @NotBlank
    private String title;

    private UUID targetUserId;

    private ActivityPurpose activityPurpose;

    private ActivityType activityType;

    private LocalDateTime activityDateTime;

    private String requestContent;


}
