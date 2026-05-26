// 인수인계: 이전 대화 한 줄을 나타내는 DTO입니다.
// 핵심 흐름: role은 user/assistant만 허용하고 content는 LangGraph history로 들어가 후속 질문의 맥락을 만듭니다.
// 같이 확인: AI schemas/answer.py의 ConversationMessage와 같은 필드명을 유지하세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ConversationMessageRequest {

    @Pattern(regexp = "user|assistant")
    private String role;

    @NotBlank
    private String content;
}
