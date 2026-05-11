package com.nkia.Orbis.domain.bid.prbresult.dto.request;

import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public record PrbResultCreateRequest(
        @NotNull(message = "PRB ID는 필수입니다.") Long prbId,
        String riskFactors,
        String comprehensiveOpinion,
        String meetingLocation,
        LocalDateTime meetingDateTime,
        @Valid List<PrbResultAttendeeOpinionRequest> attendeeOpinions
) {
    // DTO -> Entity 변환 메서드
    public PrbResult toEntity(Prb prb) {
        PrbResult result = PrbResult.builder()
                .prb(prb)
                .riskFactors(this.riskFactors)
                .comprehensiveOpinion(this.comprehensiveOpinion)
                .meetingLocation(this.meetingLocation)
                .meetingDateTime(this.meetingDateTime)
                .build();

        addAttendeeOpinion(result);
        return result;
    }

    private void addAttendeeOpinion(PrbResult result) {
        if (this.attendeeOpinions != null) {
            this.attendeeOpinions.stream()
                    .map(PrbResultAttendeeOpinionRequest::toValueObject)
                    .forEach(result::addAttendeeOpinion);
        }
    }
}