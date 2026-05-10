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
