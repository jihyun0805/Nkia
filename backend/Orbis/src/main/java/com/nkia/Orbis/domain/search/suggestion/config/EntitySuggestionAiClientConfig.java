package com.nkia.Orbis.domain.search.suggestion.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Configuration
public class EntitySuggestionAiClientConfig {

    @Bean
    public RestClient entitySuggestionAiRestClient(
            @Value("${ai.api.base-url}") String baseUrl,
            @Value("${ai.api.internal-token}") String internalToken,
            @Value("${ai.api.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${ai.api.request-timeout-ms}") int requestTimeoutMs
    ) {
        if (!StringUtils.hasText(baseUrl)) {
            throw new IllegalStateException("AI API base URL is not configured.");
        }
        if (!StringUtils.hasText(internalToken)) {
            throw new IllegalStateException("AI internal token is not configured.");
        }

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(requestTimeoutMs);

        return RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Orbis-Internal-Token", internalToken)
                .requestFactory(requestFactory)
                .build();
    }
}
