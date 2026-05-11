package com.nkia.Orbis.domain.bid.prbresult.dto.request;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;

public record PrbResultUpdateRequest(
        String riskFactors,
        String comprehensiveOpinion,
        String meetingLocation,
        LocalDateTime meetingDateTime,
        @Valid List<PrbResultAttendeeOpinionRequest> attendeeOpinions
) {
}