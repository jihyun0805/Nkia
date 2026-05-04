package com.nkia.Orbis.common.ai.businesscardocr.service;

import com.nkia.Orbis.common.ai.businesscardocr.dto.AiBusinessCardOcrResponse;
import com.nkia.Orbis.common.ai.businesscardocr.dto.BusinessCardOcrResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.base-url:http://localhost:8000}")
    private String aiBaseUrl;

    public BusinessCardOcrResponse analyze(MultipartFile file) {
        validateImage(file);

        Path tempFile = null;
        try {
            tempFile = Files.createTempFile("business-card-", "-" + sanitizeFilename(file.getOriginalFilename()));
            file.transferTo(tempFile);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(tempFile));

            ResponseEntity<AiBusinessCardOcrResponse> response = restTemplate.postForEntity(
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
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ignored) {
                }
            }
        }
    }

    private void validateImage(MultipartFile file) {
        if (file.isEmpty() || file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("image file only");
        }
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "business-card";
        }
        return filename.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
