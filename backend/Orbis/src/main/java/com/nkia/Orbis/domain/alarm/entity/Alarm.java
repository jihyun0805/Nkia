package com.nkia.Orbis.domain.alarm.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "alarms")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Alarm extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender; // 시스템 자동 알림일 경우 null 가능성 고려

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlarmType type;

    @Column(nullable = false)
    private String message; // 예: "새로운 수주보고 결재 요청이 도착했습니다."

    @Column(name = "target_id")
    private Long targetId; // 클릭 시 이동할 도메인의 ID (예: Contract ID)

    @Column(nullable = false)
    private boolean isRead = false;

    @Builder
    public Alarm(User sender, User receiver, AlarmType type, String message, Long targetId) {
        this.sender = sender;
        this.receiver = receiver;
        this.type = type;
        this.message = message;
        this.targetId = targetId;
        this.isRead = false;
    }

    public void markAsRead() {
        this.isRead = true;
    }
}