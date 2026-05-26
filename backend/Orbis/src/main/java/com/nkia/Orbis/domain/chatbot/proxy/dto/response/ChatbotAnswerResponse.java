// 인수인계: AI /answer 응답을 백엔드가 프론트로 전달하는 DTO입니다.
// 핵심 흐름: answer 본문, threadId, 신뢰도, 근거 목록, typedEvidences, draft/edit/navigate actions를 모두 담습니다.
// 같이 확인: 필드 변경 시 AI AnswerResponse와 frontend ChatbotAnswerPayload를 같은 이름으로 맞춰야 합니다.
package com.nkia.Orbis.domain.chatbot.proxy.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatbotAnswerResponse {

    private String query;
    private String answer;
    private String threadId;
    private String route;
    private String answerStatus;
    private String embeddingModel;
    private String chatModel;
    private Double retrievalConfidence;
    private String confidenceBand;
    private List<String> confidenceReasons = new ArrayList<>();
    private List<String> appliedDefaults = new ArrayList<>();
    private List<String> missingRequiredSlots = new ArrayList<>();
    private String degradedReason;
    private List<String> excludedSourceTypes = new ArrayList<>();
    private List<ChatbotEvidenceResponse> evidences = new ArrayList<>();
    private ChatbotTypedEvidencesResponse typedEvidences = new ChatbotTypedEvidencesResponse();
    private List<ChatbotDraftActionResponse> actions = new ArrayList<>();
}
