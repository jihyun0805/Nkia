package com.nkia.Orbis.domain.project.billing.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCollectRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCreateRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingIssueRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingUpdateRequest;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingDetailResponse;
import com.nkia.Orbis.domain.project.billing.service.BillingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects/billings")
@RequiredArgsConstructor
@Tag(name = "Billings", description = "청구 및 수금 관리 API")
public class BillingController {
    private final BillingService billingService;

    /**
     *  세금계산서 발행 요청 등록
     */
    @Operation(summary = "청구(발행 요청) 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> register(@Valid @RequestBody BillingCreateRequest request) {
        Long billingId = billingService.registerBilling(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(billingId));
    }

    /**
     *  세금계산서 발행 확인 처리
     */
    @Operation(summary = "세금계산서 발행 확인")
    @PostMapping("/{billingId}/issue")
    public ResponseEntity<ApiResponse<Void>> confirmIssue(
            @PathVariable Long billingId,
            @Valid @RequestBody BillingIssueRequest request) {

        billingService.issueBilling(billingId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     *  수금 완료 확인 처리
     */
    @Operation(summary = "수금 확인 등록")
    @PostMapping("/{billingId}/collect")
    public ResponseEntity<ApiResponse<Void>> confirmCollection(
            @PathVariable Long billingId,
            @Valid @RequestBody BillingCollectRequest request) {

        billingService.collectBilling(billingId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 청구 정보 통합 수정
     */
    @Operation(summary = "청구 정보 수정")
    @PutMapping("/{billingId}")
    public ResponseEntity<ApiResponse<BillingDetailResponse>> updateBilling(
            @PathVariable Long billingId,
            @RequestBody BillingUpdateRequest request) {

        BillingDetailResponse response = billingService.updateBilling(billingId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 청구 정보 삭제
     */
    @Operation(summary = "청구 정보 삭제")
    @DeleteMapping("/{billingId}")
    public ResponseEntity<ApiResponse<Void>> deleteBilling(
            @PathVariable Long billingId) {

        billingService.deleteBilling(billingId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
