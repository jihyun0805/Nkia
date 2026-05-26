// 인수인계: AI 서버 RestClient 설정 파일입니다.
// 핵심 흐름: chatbot.ai.base-url, timeout, 공통 header 같은 프록시 호출 설정을 Spring bean으로 제공합니다.
// 같이 확인: AI API 경로나 timeout 변경 시 ChatbotProxyService 호출부와 운영 env를 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Configuration
public class ChatbotAiClientConfig {

    @Bean
    public RestClient chatbotAiRestClient(
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
