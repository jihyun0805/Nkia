// 인수인계: 챗봇 메시지 엔티티입니다.
// 핵심 흐름: role/content 외에 assistant 답변의 route, answerStatus, evidences, typedEvidences, actions를 JSON 문자열로 저장합니다.
// 같이 확인: 프론트 재렌더링 필드 변경 시 ChatMessageResponse와 chatbot-api.ts 타입을 같이 맞추세요.
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
