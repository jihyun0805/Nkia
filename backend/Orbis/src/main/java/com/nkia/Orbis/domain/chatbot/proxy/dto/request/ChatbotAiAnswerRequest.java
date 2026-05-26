// 인수인계 메모: 챗봇 프록시 계층입니다. 프론트 요청을 받아 사용자 권한 컨텍스트를 조립하고 AI 서버로 전달합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatbotAiAnswerRequest {

    private String query;

    private List<ConversationMessageRequest> history = new ArrayList<>();

    private Integer limit = 5;

    private String threadId;

    private String attachmentSessionId;

    private String startAt;

    private String endAt;

    private ChatbotAiUserContext userContext;

    public static ChatbotAiAnswerRequest from(
            ChatbotAnswerRequest request,
            String scopedThreadId,
            String scopedAttachmentSessionId,
            ChatbotAiUserContext userContext
    ) {
        ChatbotAiAnswerRequest upstreamRequest = new ChatbotAiAnswerRequest();
        upstreamRequest.query = request.getQuery();
        upstreamRequest.history = request.getHistory();
        upstreamRequest.limit = request.getLimit();
        upstreamRequest.threadId = scopedThreadId;
        upstreamRequest.attachmentSessionId = scopedAttachmentSessionId;
        upstreamRequest.startAt = request.getStartAt();
        upstreamRequest.endAt = request.getEndAt();
        upstreamRequest.userContext = userContext;
        return upstreamRequest;
    }
}
