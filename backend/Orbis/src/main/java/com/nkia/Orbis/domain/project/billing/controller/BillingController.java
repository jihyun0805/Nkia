package com.nkia.Orbis.domain.project.billing.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.SubmitRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCollectRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCreateRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingIssueRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingUpdateRequest;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingDetailResponse;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingFormInitResponse;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingListResponse;
import com.nkia.Orbis.domain.project.billing.service.BillingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
     * 수주보고서 선택 시 화면을 자동으로 채워줄 정보를 반환
     */
    @Operation(summary = "청구 폼 초기화 데이터 조회")
    @GetMapping("/form-init/{orderReportId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'READ')")
    public ResponseEntity<ApiResponse<BillingFormInitResponse>> getBillingInitData(
            @PathVariable Long orderReportId,
            Principal principal) {

        String userId = (principal != null) ? principal.getName() : "홍길동(임시)";
        BillingFormInitResponse response = billingService.getBillingInitData(orderReportId, userId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 세금계산서 발행 요청 등록
     */
    @Operation(summary = "청구(발행 요청) 등록")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'CREATE')")
    public ResponseEntity<ApiResponse<Long>> register(@Valid @RequestBody BillingCreateRequest request) {
        Long billingId = billingService.registerBilling(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(billingId));
    }

    /**
     * 세금계산서 발행 확인 처리
     */
    @Operation(summary = "세금계산서 발행 확인")
    @PostMapping("/{billingId}/issue")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'MANAGE')")
    public ResponseEntity<ApiResponse<Void>> confirmIssue(
            @PathVariable Long billingId,
            @Valid @RequestBody BillingIssueRequest request) {

        billingService.issueBilling(billingId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 수금 완료 확인 처리
     */
    @Operation(summary = "수금 확인 등록")
    @PostMapping("/{billingId}/collect")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'MANAGE')")
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
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'UPDATE')")
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
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteBilling(
            @PathVariable Long billingId) {

        billingService.deleteBilling(billingId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 청구 및 수금 현황 목록 조회
     */
    @Operation(summary = "청구 및 수금 현황 목록 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'READ')")
    public ResponseEntity<ApiResponse<List<BillingListResponse>>> getBillings() {
        List<BillingListResponse> response = billingService.getBillingList();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 청구 상세 조회
     */
    @Operation(summary = "청구 상세 조회")
    @GetMapping("/{billingId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'READ')")
    public ResponseEntity<ApiResponse<BillingDetailResponse>> getBilling(
            @PathVariable Long billingId) {

        BillingDetailResponse response = billingService.getBillingDetail(billingId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "세금계산서 결재 상신")
    @PostMapping("/submit/{billingId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BILLING', 'UPDATE')")
    public ResponseEntity<ApiResponse<String>> submitBilling(
            @PathVariable("billingId") Long billingId,
            @RequestBody SubmitRequest request
    ) {
        billingService.submitBilling(
                billingId,
                request.getFirstApproverId()
        );

        return ResponseEntity.ok(ApiResponse.success("세금계산서 결재 상신 완료"));
    }
}
