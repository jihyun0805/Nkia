package com.nkia.Orbis.domain.search.suggestion.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.search.suggestion.dto.EntitySuggestionsResponse;
import com.nkia.Orbis.domain.search.suggestion.service.EntitySuggestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/search/suggestions")
@RequiredArgsConstructor
@Tag(name = "Search Suggestions", description = "Entity autocomplete suggestion API")
public class EntitySuggestionController {

    private final EntitySuggestionService entitySuggestionService;

    @Operation(summary = "Entity autocomplete suggestions")
    @GetMapping
    public ResponseEntity<ApiResponse<EntitySuggestionsResponse>> getSuggestions(
            @RequestParam String q,
            @RequestParam(defaultValue = "all") String target,
            @RequestParam(defaultValue = "8") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.success(entitySuggestionService.getSuggestions(q, target, limit)));
    }
}
