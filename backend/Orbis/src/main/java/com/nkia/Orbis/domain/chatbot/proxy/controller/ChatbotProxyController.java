// 인수인계 메모: 챗봇 프록시 계층입니다. 프론트 요청을 받아 사용자 권한 컨텍스트를 조립하고 AI 서버로 전달합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.controller;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CommonErrorCode;
import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.chatbot.proxy.dto.request.ChatbotAnswerRequest;
import com.nkia.Orbis.domain.chatbot.proxy.dto.request.DeleteChatbotAttachmentRequest;
import com.nkia.Orbis.domain.chatbot.proxy.dto.response.ChatbotAnswerResponse;
import com.nkia.Orbis.domain.chatbot.proxy.dto.response.ChatbotAttachmentDeleteResponse;
import com.nkia.Orbis.domain.chatbot.proxy.dto.response.ChatbotAttachmentResponse;
import com.nkia.Orbis.domain.chatbot.proxy.dto.response.ChatbotDateRangeResponse;
import com.nkia.Orbis.domain.chatbot.proxy.service.ChatbotProxyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/chatbot")
@RequiredArgsConstructor
@Tag(name = "Chatbot", description = "FE -> BE -> AI 챗봇 중계 API")
public class ChatbotProxyController {

    private final ChatbotProxyService chatbotProxyService;

    @Operation(summary = "AI 챗봇 답변 요청")
    @PostMapping("/answer")
    public ResponseEntity<ApiResponse<ChatbotAnswerResponse>> answer(
            @Valid @RequestBody ChatbotAnswerRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(chatbotProxyService.answer(request)));
    }

    @Operation(summary = "AI 챗봇 검색 가능 기간 범위 조회")
    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<ChatbotDateRangeResponse>> dateRange() {
        return ResponseEntity.ok(ApiResponse.success(chatbotProxyService.getDateRange()));
    }

    @Operation(summary = "AI 챗봇 임시 첨부파일 업로드")
    @PostMapping("/attachments")
    public ResponseEntity<ApiResponse<ChatbotAttachmentResponse>> uploadAttachment(
            @RequestPart("sessionId") String sessionId,
            @RequestPart("file") MultipartFile file
    ) {
        if (file.isEmpty()) {
            throw new ApiException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        return ResponseEntity.ok(ApiResponse.success(chatbotProxyService.uploadAttachment(sessionId, file)));
    }

    @Operation(summary = "AI 챗봇 임시 첨부파일 삭제")
    @DeleteMapping("/attachments")
    public ResponseEntity<ApiResponse<ChatbotAttachmentDeleteResponse>> deleteAttachment(
            @Valid @RequestBody DeleteChatbotAttachmentRequest request
    ) {
        chatbotProxyService.deleteAttachment(request);
        return ResponseEntity.ok(ApiResponse.success(new ChatbotAttachmentDeleteResponse(true)));
    }
}
