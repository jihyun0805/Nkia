package com.nkia.Orbis.domain.chatbot.session.dto.response;

import com.nkia.Orbis.domain.chatbot.session.entity.ChatSession;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;

@Getter
public class ChatSessionResponse {

    private final UUID id;
    private final String title;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    private ChatSessionResponse(ChatSession session) {
        this.id = session.getId();
        this.title = session.getTitle();
        this.createdAt = session.getCreatedAt();
        this.updatedAt = session.getUpdatedAt();
    }

    public static ChatSessionResponse from(ChatSession session) {
        return new ChatSessionResponse(session);
    }
}
