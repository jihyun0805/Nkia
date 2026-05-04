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
