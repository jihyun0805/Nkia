package com.nkia.Orbis.domain.chatbot.session.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ChatSessionErrorCode;
import com.nkia.Orbis.domain.chatbot.session.dto.request.AddMessageRequest;
import com.nkia.Orbis.domain.chatbot.session.dto.request.CreateSessionRequest;
import com.nkia.Orbis.domain.chatbot.session.dto.request.UpdateSessionTitleRequest;
import com.nkia.Orbis.domain.chatbot.session.dto.response.ChatMessageResponse;
import com.nkia.Orbis.domain.chatbot.session.dto.response.ChatSessionResponse;
import com.nkia.Orbis.domain.chatbot.session.entity.ChatMessage;
import com.nkia.Orbis.domain.chatbot.session.entity.ChatSession;
import com.nkia.Orbis.domain.chatbot.session.repository.ChatMessageRepository;
import com.nkia.Orbis.domain.chatbot.session.repository.ChatSessionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatSessionService {

    private static final int SESSION_PAGE_SIZE = 200;

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionOwnerResolver chatSessionOwnerResolver;

    /**
     * 현재 사용자(로그인/익명)의 챗봇 세션 목록 조회 (최신순, 최대 200개)
     */
    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getMySessions() {
        String userId = chatSessionOwnerResolver.resolveCurrentOwnerId();
        return chatSessionRepository
                .findByUserIdAndNotDeleted(userId, PageRequest.of(0, SESSION_PAGE_SIZE))
                .stream()
                .map(ChatSessionResponse::from)
                .toList();
    }

    /**
     * 새 챗봇 세션 생성
     */
    @Transactional
    public ChatSessionResponse createSession(CreateSessionRequest request) {
        String userId = chatSessionOwnerResolver.resolveCurrentOwnerId();
        ChatSession session = ChatSession.builder()
                .userId(userId)
                .title(request.getTitle())
                .build();
        return ChatSessionResponse.from(chatSessionRepository.save(session));
    }

    /**
     * 챗봇 세션 삭제 (소프트 삭제)
     */
    @Transactional
    public void deleteSession(UUID sessionId) {
        String userId = chatSessionOwnerResolver.resolveCurrentOwnerId();
        ChatSession session = getOwnedSession(sessionId, userId);
        session.delete();
    }

    /**
     * 챗봇 세션 제목 수정
     */
    @Transactional
    public ChatSessionResponse updateSessionTitle(UUID sessionId, UpdateSessionTitleRequest request) {
        String userId = chatSessionOwnerResolver.resolveCurrentOwnerId();
        ChatSession session = getOwnedSession(sessionId, userId);
        session.updateTitle(request.getTitle());
        return ChatSessionResponse.from(session);
    }

    /**
     * 세션 메시지 목록 조회
     */
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(UUID sessionId) {
        String userId = chatSessionOwnerResolver.resolveCurrentOwnerId();
        // 세션 소유권 검증
        getOwnedSession(sessionId, userId);
        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    /**
     * 메시지 추가 (user + assistant 쌍)
     */
    @Transactional
    public List<ChatMessageResponse> addMessages(UUID sessionId, AddMessageRequest request) {
        String userId = chatSessionOwnerResolver.resolveCurrentOwnerId();
        ChatSession session = getOwnedSession(sessionId, userId);

        ChatMessage userMessage = ChatMessage.builder()
                .session(session)
                .role("user")
                .content(request.getUserContent())
                .threadId(null)
                .route(null)
                .answerStatus(null)
                .evidences(null)
                .typedEvidences(null)
                .actions(null)
                .build();

        ChatMessage assistantMessage = ChatMessage.builder()
                .session(session)
                .role("assistant")
                .content(request.getAssistantContent())
                .threadId(request.getThreadId())
                .route(request.getRoute())
                .answerStatus(request.getAnswerStatus())
                .evidences(request.getEvidences())
                .typedEvidences(request.getTypedEvidences())
                .actions(request.getActions())
                .build();

        chatMessageRepository.save(userMessage);
        chatMessageRepository.save(assistantMessage);
        session.markMessagePersisted(request.getThreadId() != null ? request.getThreadId() : session.getId().toString());

        return List.of(
                ChatMessageResponse.from(userMessage),
                ChatMessageResponse.from(assistantMessage)
        );
    }

    private ChatSession getOwnedSession(UUID sessionId, String userId) {
        return chatSessionRepository.findByIdAndUserIdAndNotDeleted(sessionId, userId)
                .orElseThrow(() -> new ApiException(ChatSessionErrorCode.SESSION_NOT_FOUND));
    }
}
