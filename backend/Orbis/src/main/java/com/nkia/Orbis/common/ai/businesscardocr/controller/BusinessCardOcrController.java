package com.nkia.Orbis.common.ai.businesscardocr.controller;

import com.nkia.Orbis.common.ai.businesscardocr.dto.BusinessCardOcrResponse;
import com.nkia.Orbis.common.ai.businesscardocr.service.BusinessCardOcrService;
import com.nkia.Orbis.common.exception.errorcode.CommonErrorCode;
import com.nkia.Orbis.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/business-card-ocr")
@RequiredArgsConstructor
@Tag(name = "BusinessCardOCR", description = "Business card OCR API")
public class BusinessCardOcrController {

    private final BusinessCardOcrService businessCardOcrService;

    @Operation(summary = "Analyze business card image")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<BusinessCardOcrResponse>> analyze(@RequestPart("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(ApiResponse.success(businessCardOcrService.analyze(file)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(ApiResponse.fail(CommonErrorCode.INVALID_INPUT_VALUE, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity
                    .internalServerError()
                    .body(ApiResponse.fail(CommonErrorCode.INTERNAL_SERVER_ERROR, e.getMessage()));
        }
    }
}
