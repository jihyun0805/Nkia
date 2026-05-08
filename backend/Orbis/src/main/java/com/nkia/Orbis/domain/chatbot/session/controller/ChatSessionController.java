package com.nkia.Orbis.domain.chatbot.session.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.chatbot.session.dto.request.AddMessageRequest;
import com.nkia.Orbis.domain.chatbot.session.dto.request.CreateSessionRequest;
import com.nkia.Orbis.domain.chatbot.session.dto.request.UpdateSessionTitleRequest;
import com.nkia.Orbis.domain.chatbot.session.dto.response.ChatMessageResponse;
import com.nkia.Orbis.domain.chatbot.session.dto.response.ChatSessionResponse;
import com.nkia.Orbis.domain.chatbot.session.service.ChatSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chatbot/sessions")
@RequiredArgsConstructor
@Tag(name = "ChatbotSession", description = "챗봇 세션 저장 API")
public class ChatSessionController {

    private final ChatSessionService chatSessionService;

    @Operation(summary = "내 챗봇 세션 목록 조회 (최신순 20개)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ChatSessionResponse>>> getMySessions() {
        return ResponseEntity.ok(ApiResponse.success(chatSessionService.getMySessions()));
    }

    @Operation(summary = "새 챗봇 세션 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<ChatSessionResponse>> createSession(
            @Valid @RequestBody CreateSessionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(chatSessionService.createSession(request)));
    }

    @Operation(summary = "챗봇 세션 삭제")
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @PathVariable UUID sessionId
    ) {
        chatSessionService.deleteSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "챗봇 세션 제목 수정")
    @PutMapping("/{sessionId}/title")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> updateSessionTitle(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpdateSessionTitleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(chatSessionService.updateSessionTitle(sessionId, request)));
    }

    @Operation(summary = "세션 메시지 목록 조회")
    @GetMapping("/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            @PathVariable UUID sessionId
    ) {
        return ResponseEntity.ok(ApiResponse.success(chatSessionService.getMessages(sessionId)));
    }

    @Operation(summary = "세션에 메시지 추가 (user + assistant 쌍)")
    @PostMapping("/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> addMessages(
            @PathVariable UUID sessionId,
            @Valid @RequestBody AddMessageRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(chatSessionService.addMessages(sessionId, request)));
    }
}
