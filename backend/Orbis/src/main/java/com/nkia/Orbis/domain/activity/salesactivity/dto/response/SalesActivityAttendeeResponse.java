package com.nkia.Orbis.domain.activity.salesactivity.dto.response;

import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivityAttendee;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesActivityAttendeeResponse {
    private UUID userId;

    private String userName;

    public static SalesActivityAttendeeResponse from(SalesActivityAttendee attendee) {
        return SalesActivityAttendeeResponse.builder()
                .userId(attendee.getUser().getId())
                .userName(attendee.getUser().getName())
                .build();
    }
}
