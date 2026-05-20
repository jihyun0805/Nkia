package com.nkia.Orbis.domain.bid.prbresult.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResultHistory;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbResultHistoryResponse {

    private Long historyId;
    private Long prbResultId;
    private Integer version;
    private ApprovalStatus status;
    private Long prbId;
    private String riskFactors;
    private String comprehensiveOpinion;
    private String meetingLocation;
    private LocalDateTime meetingDateTime;
    private String createdByName; // 수정자(작성자) 이름
    private LocalDateTime createdAt;
    private List<AttendeeOpinionHistoryDto> attendeeOpinions;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendeeOpinionHistoryDto {
        private UUID attendeeUserId;
        private String attendeeName;
        private String opinion;
        private String approvalStatus;
    }

    public static PrbResultHistoryResponse of(PrbResultHistory history, User creator, Map<UUID, User> attendeeMap) {
        if (history == null) {
            return null;
        }

        // 값 타입 컬렉션(참석자 의견) 내의 User ID를 기반으로 Batch 조회된 Map에서 이름을 찾아 매핑
        List<AttendeeOpinionHistoryDto> opinions = history.getAttendeeOpinions().stream()
                .map(op -> {
                    User attendee = attendeeMap.get(op.getAttendeeUserId());
                    return AttendeeOpinionHistoryDto.builder()
                            .attendeeUserId(op.getAttendeeUserId())
                            .attendeeName(attendee != null ? attendee.getName() : "Unknown")
                            .opinion(op.getOpinion())
                            .approvalStatus(op.getApprovalStatus() != null ? op.getApprovalStatus().name() : null)
                            .build();
                }).toList();

        return PrbResultHistoryResponse.builder()
                .historyId(history.getId())
                .prbResultId(history.getPrbResultId())
                .version(history.getVersion())
                .status(history.getStatus())
                .prbId(history.getPrb() != null ? history.getPrb().getId() : null)
                .riskFactors(history.getRiskFactors())
                .comprehensiveOpinion(history.getComprehensiveOpinion())
                .meetingLocation(history.getMeetingLocation())
                .meetingDateTime(history.getMeetingDateTime())
                .createdByName(creator != null ? creator.getName() : "Unknown")
                .createdAt(history.getCreatedAt())
                .attendeeOpinions(opinions)
                .build();
    }
}