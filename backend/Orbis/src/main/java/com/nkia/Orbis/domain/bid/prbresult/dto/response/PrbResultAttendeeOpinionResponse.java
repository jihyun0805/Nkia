package com.nkia.Orbis.domain.bid.prbresult.dto.response;

import com.nkia.Orbis.domain.bid.prbresult.entity.ApprovalStatus;
import java.util.UUID;

public record PrbResultAttendeeOpinionResponse(
        UUID attendeeUserId,
        String attendeeUserName, // UI 출력을 위한 유저명
        String opinion,
        ApprovalStatus approvalStatus
) {
}