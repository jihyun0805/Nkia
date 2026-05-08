package com.nkia.Orbis.domain.report.management.service;

import com.nkia.Orbis.common.exception.errorcode.CommonErrorCode;
import com.nkia.Orbis.domain.report.management.dto.request.ManagementReportRequest;
import com.nkia.Orbis.domain.report.management.dto.response.ManagementReportResponse;
import com.nkia.Orbis.domain.report.management.exception.ReportProxyException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class ManagementReportService {

    private final RestClient reportAiRestClient;
    private final ManagementReportAggregationService aggregationService;

    public ManagementReportService(
            @Value("${ai.api.base-url}") String baseUrl,
            @Value("${ai.api.internal-token}") String internalToken,
            @Value("${ai.api.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${ai.api.request-timeout-ms}") int requestTimeoutMs,
            ManagementReportAggregationService aggregationService
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

        this.reportAiRestClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Orbis-Internal-Token", internalToken)
                .requestFactory(requestFactory)
                .build();
        this.aggregationService = aggregationService;
    }

    public ManagementReportResponse createReport(ManagementReportRequest request) {
        try {
            ManagementReportResponse response = reportAiRestClient.post()
                    .uri("/management-report")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(ManagementReportResponse.class);
            aggregationService.attachAnalytics(response, request);
            return response;
        } catch (RestClientResponseException e) {
            throw mapUpstreamException(e, "AI report generation failed.");
        } catch (Exception e) {
            throw new ReportProxyException(CommonErrorCode.INTERNAL_SERVER_ERROR, "AI server request failed.");
        }
    }

    private ReportProxyException mapUpstreamException(RestClientResponseException e, String fallbackMessage) {
        String responseBody = e.getResponseBodyAsString();
        String message = (responseBody == null || responseBody.isBlank()) ? fallbackMessage : responseBody;
        CommonErrorCode errorCode = e.getStatusCode().is4xxClientError()
                ? CommonErrorCode.INVALID_INPUT_VALUE
                : CommonErrorCode.INTERNAL_SERVER_ERROR;
        return new ReportProxyException(errorCode, message);
    }
}
