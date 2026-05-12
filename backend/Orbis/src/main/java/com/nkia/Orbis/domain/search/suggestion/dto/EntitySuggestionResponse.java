package com.nkia.Orbis.domain.search.suggestion.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.HashMap;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class EntitySuggestionResponse {

    private String type;
    private String id;
    private String code;
    private String label;
    private String subtitle;
    private Double score;
    private String matchedBy;
    private Map<String, Object> metadata = new HashMap<>();
}
