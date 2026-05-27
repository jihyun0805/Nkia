// 인수인계 메모: 채팅 세션/메시지 저장 계층입니다. 사용자별 대화 목록과 메시지 이력을 DB에 보존합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.session.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "chat_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage extends BaseEntity {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "UUID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    // "user" or "assistant"
    @Column(nullable = false)
    private String role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column
    private String threadId;

    @Column
    private String route;

    @Column
    private String answerStatus;

    // JSON serialized evidences list
    @Column(columnDefinition = "TEXT")
    private String evidences;

    @Column(columnDefinition = "TEXT")
    private String typedEvidences;

    @Column(columnDefinition = "TEXT")
    private String actions;

    @Builder
    public ChatMessage(
            ChatSession session,
            String role,
            String content,
            String threadId,
            String route,
            String answerStatus,
            String evidences,
            String typedEvidences,
            String actions
    ) {
        this.session = session;
        this.role = role;
        this.content = content;
        this.threadId = threadId;
        this.route = route;
        this.answerStatus = answerStatus;
        this.evidences = evidences;
        this.typedEvidences = typedEvidences;
        this.actions = actions;
    }
}
