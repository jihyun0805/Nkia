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
