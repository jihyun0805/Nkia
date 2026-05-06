package com.nkia.Orbis.common.ai.businesscardocr.service;

import com.nkia.Orbis.common.ai.businesscardocr.dto.AiBusinessCardOcrResponse;
import com.nkia.Orbis.common.ai.businesscardocr.dto.BusinessCardOcrResponse;
import java.io.IOException;
import java.time.Duration;
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
public class BusinessCardOcrService {

    @Value("${ai.base-url:http://localhost:8000}")
    private String aiBaseUrl;

    @Value("${ai.api.connect-timeout-ms:3000}")
    private int connectTimeoutMs;

    @Value("${ai.api.request-timeout-ms:65000}")
    private int requestTimeoutMs;

    public BusinessCardOcrResponse analyze(MultipartFile file) {
        validateImage(file);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", createImagePart(file));

            ResponseEntity<AiBusinessCardOcrResponse> response = createRestTemplate().postForEntity(
                    aiBaseUrl + "/ocr/business-card",
                    new HttpEntity<>(body, headers),
                    AiBusinessCardOcrResponse.class
            );

            AiBusinessCardOcrResponse responseBody = response.getBody();
            if (responseBody == null) {
                throw new IllegalStateException("AI OCR response is empty");
            }
            return responseBody.toResponse();
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read business card image", e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("AI OCR server is unavailable. Check AI_API_BASE_URL or start the AI service.", e);
        } catch (RestClientResponseException e) {
            throw new IllegalStateException("AI OCR request failed: " + e.getResponseBodyAsString(), e);
        }
    }

    private void validateImage(MultipartFile file) {
        if (file.isEmpty() || file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("image file only");
        }
    }

    private HttpEntity<Resource> createImagePart(MultipartFile file) throws IOException {
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return sanitizeFilename(file.getOriginalFilename());
            }
        };

        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType(file.getContentType()));
        partHeaders.setContentDispositionFormData("file", resource.getFilename());
        return new HttpEntity<>(resource, partHeaders);
    }

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(requestTimeoutMs));
        return new RestTemplate(requestFactory);
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "business-card";
        }
        return filename.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
