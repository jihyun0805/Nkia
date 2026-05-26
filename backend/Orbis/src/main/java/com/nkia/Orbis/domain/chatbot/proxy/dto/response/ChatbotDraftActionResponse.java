// 인수인계: AI 답변 아래에 표시할 액션 버튼 DTO입니다.
// 핵심 흐름: type은 create_draft/edit_field/navigate 중 하나이며 payload는 프론트 ChatActions가 sessionStorage prefill 또는 라우팅에 사용합니다.
// 같이 확인: payload 구조 변경 시 frontend ChatActions와 use-chatbot-prefill.ts를 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatbotDraftActionResponse {

    private String type;
    private String label;
    private String buttonLabel;
    private String documentType;
    private Map<String, Object> payload = new HashMap<>();
    private List<String> evidenceIds = new ArrayList<>();
    private Double confidence;
    private List<String> reasons = new ArrayList<>();
}
