package com.nkia.Orbis.domain.alarm.dto.response;

import com.nkia.Orbis.domain.alarm.entity.Alarm;
import com.nkia.Orbis.domain.alarm.entity.AlarmType;
import java.time.LocalDateTime;

public record AlarmResponse(
        Long id,
        String senderName,   // 화면에 "홍길동님이 결재를 요청했습니다" 표기를 위해
        AlarmType type,
        String message,
        Long targetId,
        boolean isRead,
        LocalDateTime createdAt
) {
    /**
     * 엔티티를 DTO로 변환하는 정적 팩토리 메서드 ProjectOpportunityResponse.from() 과 동일한 컨벤션 유지
     */
    public static AlarmResponse from(Alarm alarm) {
        // 시스템 자동 알림일 경우 Sender가 null일 수 있으므로 방어 로직 추가
        String senderName = (alarm.getSender() != null) ? alarm.getSender().getName() : "시스템";

        return new AlarmResponse(
                alarm.getId(),
                senderName,
                alarm.getType(),
                alarm.getMessage(),
                alarm.getTargetId(),
                alarm.isRead(),
                alarm.getCreatedAt()
        );
    }
}