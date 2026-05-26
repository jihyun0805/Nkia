// 인수인계: 저장된 ChatMessage 엔티티를 프론트 payload로 변환하는 응답 DTO입니다.
// 핵심 흐름: evidences/typedEvidences/actions는 DB의 JSON 문자열을 파싱하지 않고 그대로 보내며 프론트가 타입으로 복원합니다.
// 같이 확인: 필드 추가 시 ChatMessage entity, AddMessageRequest, frontend mapChatMessagePayload를 같이 수정하세요.
package com.nkia.Orbis.domain.chatbot.session.dto.response;

import com.nkia.Orbis.domain.chatbot.session.entity.ChatMessage;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;

@Getter
public class ChatMessageResponse {

    private final UUID id;
    private final UUID sessionId;
    private final String role;
    private final String content;
    private final String threadId;
    private final String route;
    private final String answerStatus;
    private final String evidences;
    private final String typedEvidences;
    private final String actions;
    private final LocalDateTime createdAt;

    private ChatMessageResponse(ChatMessage message) {
        this.id = message.getId();
        this.sessionId = message.getSession().getId();
        this.role = message.getRole();
        this.content = message.getContent();
        this.threadId = message.getThreadId();
        this.route = message.getRoute();
        this.answerStatus = message.getAnswerStatus();
        this.evidences = message.getEvidences();
        this.typedEvidences = message.getTypedEvidences();
        this.actions = message.getActions();
        this.createdAt = message.getCreatedAt();
    }

    public static ChatMessageResponse from(ChatMessage message) {
        return new ChatMessageResponse(message);
    }
}
