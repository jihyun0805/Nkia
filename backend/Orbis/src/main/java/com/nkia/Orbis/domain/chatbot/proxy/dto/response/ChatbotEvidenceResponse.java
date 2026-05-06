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
public class ChatbotEvidenceResponse {

    private String evidenceType;
    private String sourceType;
    private String sourceId;
    private String title;
    private Integer chunkIndex;
    private Double distance;
    private Double vectorScore;
    private Double keywordScore;
    private Double finalScore;
    private List<String> matchedBy = new ArrayList<>();
    private String content;
    private Map<String, Object> metadata = new HashMap<>();
}
