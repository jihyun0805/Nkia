package com.nkia.Orbis.common.ai.rfpsummary.service;

import com.nkia.Orbis.common.ai.rfpsummary.dto.AiRfpSummaryResponse;
import com.nkia.Orbis.common.ai.rfpsummary.dto.RfpSummaryResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class RfpSummaryService {

    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "hwp", "hwpx", "txt", "md"
    );

    @Value("${ai.base-url:http://localhost:8000}")
    private String aiBaseUrl;

    @Value("${ai.api.internal-token}")
    private String aiInternalToken;

    @Value("${ai.api.connect-timeout-ms:3000}")
    private int connectTimeoutMs;

    @Value("${ai.api.rfp-summary-timeout-ms:120000}")
    private int requestTimeoutMs;

    public RfpSummaryResponse summarize(MultipartFile file) {
        validateDocument(file);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("x-orbis-internal-token", aiInternalToken);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", createDocumentPart(file));

            ResponseEntity<AiRfpSummaryResponse> response = createRestTemplate().postForEntity(
                    aiBaseUrl + "/rfp/summary",
                    new HttpEntity<>(body, headers),
                    AiRfpSummaryResponse.class
            );

            AiRfpSummaryResponse responseBody = response.getBody();
            if (responseBody == null) {
                throw new IllegalStateException("AI RFP summary response is empty");
            }
            return responseBody.toResponse();
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read RFP document", e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("AI server is unavailable. Check AI_API_BASE_URL or start the AI service.", e);
        } catch (RestClientResponseException e) {
            throw new IllegalStateException("AI RFP summary request failed: " + e.getResponseBodyAsString(), e);
        }
    }

    private void validateDocument(MultipartFile file) {
        String filename = file.getOriginalFilename();
        String extension = getExtension(filename);
        if (file.isEmpty() || extension.isBlank() || !SUPPORTED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("지원 형식: pdf, doc, docx, ppt, pptx, hwp, hwpx, txt, md");
        }
    }

    private HttpEntity<Resource> createDocumentPart(MultipartFile file) throws IOException {
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return sanitizeFilename(file.getOriginalFilename());
            }
        };

        HttpHeaders partHeaders = new HttpHeaders();
        if (file.getContentType() != null && !file.getContentType().isBlank()) {
            partHeaders.setContentType(MediaType.parseMediaType(file.getContentType()));
        }
        partHeaders.setContentDispositionFormData("file", resource.getFilename());
        return new HttpEntity<>(resource, partHeaders);
    }

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(requestTimeoutMs));
        return new RestTemplate(requestFactory);
    }

    private String getExtension(String filename) {
        if (filename == null || filename.isBlank() || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "rfp-document";
        }
        return filename.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
