package com.nkia.Orbis.domain.activity.quotation.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.activity.quotation.dto.request.QuotationCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationHistoryResponse;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationListResponse;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationResponse;
import com.nkia.Orbis.domain.activity.quotation.service.QuotationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "견적서 삭제")
    @DeleteMapping("/{quotationId}")
    public ResponseEntity<ApiResponse<Void>> deleteQuotation(
            @PathVariable("quotationId") Long quotationId
    ) {
        quotationService.delete(quotationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "견적서 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<QuotationListResponse>>> getQuotations() {
        List<QuotationListResponse> response = quotationService.getQuotations();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "견적서 상세 조회")
    @GetMapping("/{quotationId}")
    public ResponseEntity<ApiResponse<QuotationResponse>> getQuotation(
            @PathVariable("quotationId") Long quotationId
    ) {
        QuotationResponse response = quotationService.getQuotation(quotationId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "견적서 수정")
    @PutMapping("/{quotationId}")
    public ResponseEntity<ApiResponse<QuotationResponse>> update(
            @PathVariable("quotationId") Long quotationId,
            @RequestBody QuotationCreateRequest request
    ) {
        QuotationResponse response = quotationService.update(quotationId, request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "견적서 변경 이력 목록 조회")
    @GetMapping("/{quotationId}/histories")
    public ResponseEntity<ApiResponse<List<QuotationHistoryResponse>>> getQuotationHistories(
            @PathVariable("quotationId") Long quotationId
    ) {
        List<QuotationHistoryResponse> response = quotationService.getQuotationHistories(quotationId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}