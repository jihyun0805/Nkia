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
