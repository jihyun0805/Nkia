// 인수인계: 백엔드 챗봇 프록시 서비스입니다.
// 핵심 흐름: 사용자 권한 컨텍스트와 scoped thread/attachment id를 붙여 AI 서버 /answer 및 첨부 색인 API를 호출합니다.
// 같이 확인: AI 요청/응답 DTO 변경 시 proxy dto와 frontend ChatbotAnswerPayload를 같이 맞추세요.
package com.nkia.Orbis.domain.chatbot.proxy.service;

import com.nkia.Orbis.common.exception.errorcode.CommonErrorCode;
import com.nkia.Orbis.domain.chatbot.proxy.dto.request.ChatbotAnswerRequest;
import com.nkia.Orbis.domain.chatbot.proxy.dto.request.ChatbotAiAnswerRequest;
import com.nkia.Orbis.domain.chatbot.proxy.dto.request.ChatbotAiUserContext;
import com.nkia.Orbis.domain.chatbot.proxy.dto.request.DeleteChatbotAttachmentRequest;
import com.nkia.Orbis.domain.chatbot.proxy.dto.response.ChatbotAnswerResponse;
import com.nkia.Orbis.domain.chatbot.proxy.dto.response.ChatbotAttachmentResponse;
import com.nkia.Orbis.domain.chatbot.proxy.dto.response.ChatbotDateRangeResponse;
import com.nkia.Orbis.domain.chatbot.proxy.exception.ChatbotProxyException;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
public class ChatbotProxyService {

    private final RestClient chatbotAiRestClient;
    private final ChatbotUserContextService chatbotUserContextService;

    public ChatbotProxyService(
            @Qualifier("chatbotAiRestClient") RestClient chatbotAiRestClient,
            ChatbotUserContextService chatbotUserContextService
    ) {
        this.chatbotAiRestClient = chatbotAiRestClient;
        this.chatbotUserContextService = chatbotUserContextService;
    }

    public ChatbotAnswerResponse answer(ChatbotAnswerRequest request) {
        try {
            // 프론트가 넘긴 threadId/attachmentSessionId는 사용자별 prefix를 붙여 AI 쪽에서 세션이 섞이지 않게 한다.
            String userScopeKey = chatbotUserContextService.getCurrentUserScopeKey();
            ChatbotAiUserContext userContext = chatbotUserContextService.buildCurrentUserContext();
            ChatbotAiAnswerRequest upstreamRequest = ChatbotAiAnswerRequest.from(
                    request,
                    qualifyScopedId(userScopeKey, request.getThreadId()),
                    qualifyScopedId(userScopeKey, request.getAttachmentSessionId()),
                    userContext
            );
            log.debug(
                    "Chatbot user-context userId={}, roles={}, accessibleTypes={}, accessibleIdsCount={}, accessibleIdsSample={}",
                    userContext.getUserId(),
                    userContext.getRoles(),
                    userContext.getAccessibleSourceTypes(),
                    userContext.getAccessibleSourceIds() == null ? null : userContext.getAccessibleSourceIds().size(),
                    userContext.getAccessibleSourceIds() == null
                            ? null
                            : userContext.getAccessibleSourceIds().stream().limit(10).toList()
            );

            // 실제 답변 생성은 AI 서버가 담당하고, 백엔드는 인증/권한/세션 스코프를 붙이는 프록시 역할만 한다.
            ChatbotAnswerResponse response = chatbotAiRestClient.post()
                    .uri("/answer")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(upstreamRequest)
                    .retrieve()
                    .body(ChatbotAnswerResponse.class);
            if (response == null) {
                throw new ChatbotProxyException(
                        CommonErrorCode.INTERNAL_SERVER_ERROR,
                        "AI 응답 본문이 비어 있습니다."
                );
            }
            // AI 내부에는 scoped threadId를 쓰지만, 프론트에는 원래 세션 id를 돌려준다.
            response.setThreadId(request.getThreadId());
            return response;
        } catch (RestClientResponseException e) {
            throw mapUpstreamException(e, "AI 답변 생성에 실패했습니다.");
        } catch (Exception e) {
            log.error("Chatbot AI answer proxy call failed", e);
            throw new ChatbotProxyException(CommonErrorCode.INTERNAL_SERVER_ERROR, "AI 서버 호출에 실패했습니다.");
        }
    }

    public ChatbotDateRangeResponse getDateRange() {
        try {
            return chatbotAiRestClient.get()
                    .uri("/search/date-range")
                    .retrieve()
                    .body(ChatbotDateRangeResponse.class);
        } catch (RestClientResponseException e) {
            throw mapUpstreamException(e, "AI 문서 기간 범위 조회에 실패했습니다.");
        } catch (Exception e) {
            log.error("Chatbot AI date-range proxy call failed", e);
            throw new ChatbotProxyException(CommonErrorCode.INTERNAL_SERVER_ERROR, "AI 서버 호출에 실패했습니다.");
        }
    }

    public ChatbotAttachmentResponse uploadAttachment(String sessionId, MultipartFile file) {
        try {
            byte[] fileBytes = file.getBytes();
            String scopedSessionId = qualifyScopedId(chatbotUserContextService.getCurrentUserScopeKey(), sessionId);

            // MultipartFile은 이미 stream이 닫힐 수 있으므로 byte[]로 고정한 뒤 AI 서버에 전달한다.
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };

            MultiValueMap<String, Object> formData = new LinkedMultiValueMap<>();
            formData.add("sessionId", scopedSessionId);
            formData.add("file", fileResource);

            return chatbotAiRestClient.post()
                    .uri("/internal/chat/attachments")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(formData)
                    .retrieve()
                    .body(ChatbotAttachmentResponse.class);
        } catch (IOException e) {
            throw new ChatbotProxyException(CommonErrorCode.INTERNAL_SERVER_ERROR, "첨부파일을 읽는 중 오류가 발생했습니다.");
        } catch (RestClientResponseException e) {
            throw mapUpstreamException(e, "AI 첨부파일 업로드에 실패했습니다.");
        } catch (Exception e) {
            log.error("Chatbot AI attachment upload failed", e);
            throw new ChatbotProxyException(CommonErrorCode.INTERNAL_SERVER_ERROR, "AI 서버 호출에 실패했습니다.");
        }
    }

    public void deleteAttachment(DeleteChatbotAttachmentRequest request) {
        String scopedSessionId = qualifyScopedId(
                chatbotUserContextService.getCurrentUserScopeKey(),
                request.getSessionId()
        );
        // 첨부파일 삭제는 AI 색인 API에 DELETE 이벤트를 보내 임시 세션 근거에서 제외시키는 방식이다.
        Map<String, Object> payload = Map.of(
                "attachments", List.of(
                        Map.of(
                                "fileId", request.getFileId(),
                                "parentSourceType", "CHAT_SESSION",
                                "parentSourceId", scopedSessionId,
                                "operation", "DELETE",
                                "metadata", Map.of(
                                        "origin", "chat_session",
                                        "sessionId", scopedSessionId
                                )
                        )
                )
        );

        try {
            chatbotAiRestClient.post()
                    .uri("/internal/index/attachments")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            throw mapUpstreamException(e, "AI 첨부파일 삭제에 실패했습니다.");
        } catch (Exception e) {
            log.error("Chatbot AI attachment delete failed", e);
            throw new ChatbotProxyException(CommonErrorCode.INTERNAL_SERVER_ERROR, "AI 서버 호출에 실패했습니다.");
        }
    }

    private ChatbotProxyException mapUpstreamException(RestClientResponseException e, String fallbackMessage) {
        String responseBody = e.getResponseBodyAsString();
        String message = (responseBody == null || responseBody.isBlank()) ? fallbackMessage : responseBody;
        CommonErrorCode errorCode = e.getStatusCode().is4xxClientError()
                ? CommonErrorCode.INVALID_INPUT_VALUE
                : CommonErrorCode.INTERNAL_SERVER_ERROR;
        return new ChatbotProxyException(errorCode, message);
    }

    private String qualifyScopedId(String userScopeKey, String rawId) {
        if (!StringUtils.hasText(rawId)) {
            return null;
        }
        // AI/Redis/pgvector 계층에는 같은 UUID라도 사용자별 namespace를 붙여 충돌을 막는다.
        return "USER:" + userScopeKey + ":" + rawId.trim();
    }
}
