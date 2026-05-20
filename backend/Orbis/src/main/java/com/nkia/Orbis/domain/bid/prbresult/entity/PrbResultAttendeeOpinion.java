package com.nkia.Orbis.domain.bid.prbresult.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@Embeddable
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrbResultAttendeeOpinion {

    // User 엔티티와 강결합을 피하기 위해 ID만 저장
    @Column(name = "attendee_user_id", nullable = false)
    private UUID attendeeUserId;

    @Column(name = "attendee_opinion", columnDefinition = "TEXT")
    private String opinion;

    // Enum 타입은 반드시 STRING으로 저장하여 향후 Enum 순서 변경에 따른 DB 데이터 오염 방지
    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    private ApprovalStatus approvalStatus;

    // History 저장을 위한 깊은 복사 메서드
    public PrbResultAttendeeOpinion copy() {
        return PrbResultAttendeeOpinion.builder()
                .attendeeUserId(this.attendeeUserId)
                .opinion(this.opinion)
                .approvalStatus(this.approvalStatus)
                .build();
    }
}