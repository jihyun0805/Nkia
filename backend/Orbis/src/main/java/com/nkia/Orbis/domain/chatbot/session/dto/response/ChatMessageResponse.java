// 인수인계 메모: 채팅 세션/메시지 저장 계층입니다. 사용자별 대화 목록과 메시지 이력을 DB에 보존합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
