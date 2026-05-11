package com.nkia.Orbis.domain.search.suggestion.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CommonErrorCode;
import com.nkia.Orbis.domain.search.suggestion.dto.EntitySuggestionsResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class EntitySuggestionService {

    private final RestClient aiRestClient;

    public EntitySuggestionService(@Qualifier("entitySuggestionAiRestClient") RestClient aiRestClient) {
        this.aiRestClient = aiRestClient;
    }

    public EntitySuggestionsResponse getSuggestions(String query, String target, int limit) {
        try {
            EntitySuggestionsResponse response = aiRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/suggestions")
                            .queryParam("q", query)
                            .queryParam("target", target)
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .body(EntitySuggestionsResponse.class);
            return response == null ? new EntitySuggestionsResponse() : response;
        } catch (RestClientResponseException e) {
            throw mapUpstreamException(e);
        } catch (Exception e) {
            throw new ApiException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private ApiException mapUpstreamException(RestClientResponseException e) {
        CommonErrorCode errorCode = e.getStatusCode().is4xxClientError()
                ? CommonErrorCode.INVALID_INPUT_VALUE
                : CommonErrorCode.INTERNAL_SERVER_ERROR;
        return new ApiException(errorCode);
    }
}
