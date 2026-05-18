package com.nkia.Orbis.domain.activity.salesactivity.dto.response;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesActivityAttendeeResponse {
    private UUID userId;

    private String userName;
}
