package com.nkia.Orbis.domain.search.suggestion.dto;

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
public class EntitySuggestionsResponse {

    private String query;
    private String target;
    private List<EntitySuggestionResponse> results = new ArrayList<>();
}
