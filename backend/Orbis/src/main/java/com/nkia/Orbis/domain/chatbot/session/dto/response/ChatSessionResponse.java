// 인수인계: ChatSession 엔티티를 세션 목록/생성 응답으로 내보내는 DTO입니다.
// 핵심 흐름: id/title/createdAt/updatedAt만 포함하고 메시지 목록은 별도 messages API에서 조회합니다.
// 같이 확인: 세션 목록 UI 변경 시 ChatSidebar와 getChatbotSessions 호출부를 같이 확인하세요.
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
