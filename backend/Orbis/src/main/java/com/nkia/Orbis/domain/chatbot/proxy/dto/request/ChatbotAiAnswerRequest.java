// 인수인계: AI 서버 /answer로 전달되는 최종 요청 DTO입니다.
// 핵심 흐름: 프론트 요청에 백엔드가 scoped threadId, scoped attachmentSessionId, userContext를 붙인 뒤 이 타입으로 전송합니다.
// 같이 확인: AI schemas/answer.py의 AnswerRequest alias 필드와 ChatbotAnswerRequest.from 변환 로직을 같이 확인하세요.
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
