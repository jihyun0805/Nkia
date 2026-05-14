package com.nkia.Orbis.domain.bid.prbresult.dto.request;

import com.nkia.Orbis.domain.bid.prbresult.entity.ApprovalStatus;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResultAttendeeOpinion;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record PrbResultAttendeeOpinionRequest(
        @NotNull(message = "참석자 ID는 필수입니다.") UUID attendeeUserId,
        String opinion,
        @NotNull(message = "승인 상태는 필수입니다.") ApprovalStatus approvalStatus
) {
    // DTO -> Value Object 변환 메서드
    public PrbResultAttendeeOpinion toValueObject() {
        return PrbResultAttendeeOpinion.builder()
                .attendeeUserId(this.attendeeUserId)
                .opinion(this.opinion)
                .approvalStatus(this.approvalStatus)
                .build();
    }
}