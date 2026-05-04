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
public class ChatbotTypedEvidencesResponse {

    private List<ChatbotEvidenceResponse> retrievedEvidence = new ArrayList<>();
    private List<ChatbotEvidenceResponse> structuredEvidence = new ArrayList<>();
    private List<ChatbotEvidenceResponse> derivedSummaryEvidence = new ArrayList<>();
}
