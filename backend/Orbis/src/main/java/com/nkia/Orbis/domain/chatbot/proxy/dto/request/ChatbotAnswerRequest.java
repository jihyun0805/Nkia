// 인수인계: 프론트가 백엔드 /chatbot/answer로 보내는 원본 질문 DTO입니다.
// 핵심 흐름: query, history, limit, threadId, attachmentSessionId, start/end 기간만 받고 권한 컨텍스트는 서비스에서 추가합니다.
// 같이 확인: 프론트 ChatbotAnswerRequest 타입과 validation 제약을 같이 맞추세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatbotAnswerRequest {

    @NotBlank
    private String query;

    @Valid
    private List<ConversationMessageRequest> history = new ArrayList<>();

    @Min(1)
    @Max(10)
    private Integer limit = 5;

    private String threadId;

    private String attachmentSessionId;

    private String startAt;

    private String endAt;
}
