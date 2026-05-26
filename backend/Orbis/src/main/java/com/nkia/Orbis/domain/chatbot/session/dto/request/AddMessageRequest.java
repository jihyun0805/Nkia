// 인수인계: 질문/답변 한 쌍을 세션 메시지 테이블에 저장하는 요청 DTO입니다.
// 핵심 흐름: userContent와 assistantContent는 별도 row로 저장하고 evidences/typedEvidences/actions는 JSON 문자열 그대로 보존합니다.
// 같이 확인: 프론트 addChatbotSessionMessages payload와 ChatMessage entity 컬럼 길이/타입을 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.session.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AddMessageRequest {

    // "user" question
    @NotBlank
    private String userContent;

    // "assistant" answer
    @NotBlank
    private String assistantContent;

    private String threadId;

    private String route;

    private String answerStatus;

    // Optional: JSON string of evidences list for the assistant message
    private String evidences;

    private String typedEvidences;

    private String actions;
}
