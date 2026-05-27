// 인수인계 메모: 챗봇 프록시 계층입니다. 프론트 요청을 받아 사용자 권한 컨텍스트를 조립하고 AI 서버로 전달합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
