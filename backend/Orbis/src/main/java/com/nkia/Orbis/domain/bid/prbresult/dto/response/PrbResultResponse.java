package com.nkia.Orbis.domain.bid.prbresult.dto.response;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record PrbResultResponse(
        Long id,
        Long prbId,
        String riskFactors,
        String comprehensiveOpinion,
        String meetingLocation,
        LocalDateTime meetingDateTime,
        List<PrbResultAttendeeOpinionResponse> attendeeOpinions,
        String createdByUserName,
        LocalDateTime createdAt
) {
    // 정적 팩토리 메서드: Entity -> DTO 변환
    public static PrbResultResponse of(PrbResult entity, User creator, Map<UUID, User> attendeeMap) {
        List<PrbResultAttendeeOpinionResponse> opinionResponses = getOpinionResponses(entity, attendeeMap);

        return new PrbResultResponse(
                entity.getId(),
                entity.getPrb().getId(),
                entity.getRiskFactors(),
                entity.getComprehensiveOpinion(),
                entity.getMeetingLocation(),
                entity.getMeetingDateTime(),
                opinionResponses,
                creator != null ? creator.getName() : "알 수 없음",
                entity.getCreatedAt()
        );
    }

    private static List<PrbResultAttendeeOpinionResponse> getOpinionResponses(PrbResult entity,
                                                                              Map<UUID, User> attendeeMap) {
        return entity.getAttendeeOpinions().stream()
                .map(opinion -> new PrbResultAttendeeOpinionResponse(
                        opinion.getAttendeeUserId(),
                        attendeeMap.containsKey(opinion.getAttendeeUserId()) ? attendeeMap.get(
                                opinion.getAttendeeUserId()).getName() : "알 수 없음",
                        opinion.getOpinion(),
                        opinion.getApprovalStatus()
                )).toList();
    }
}