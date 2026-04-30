package com.nkia.Orbis.domain.activity.quotation.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.activity.quotation.dto.request.QuotationCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationResponse;
import com.nkia.Orbis.domain.activity.quotation.service.QuotationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Quotation", description = "견적서 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/activity/quotations")
public class QuotationController {

    private final QuotationService quotationService;

    @Operation(summary = "견적서 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<QuotationResponse>> createQuotation(
            @Valid
            @RequestBody
            QuotationCreateRequest request
    ) {
        QuotationResponse response = quotationService.create(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}