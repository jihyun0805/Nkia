package com.nkia.Orbis.domain.maintenance.maintenancequotation.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.SubmitRequest;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request.MaintenanceQuotationCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request.MaintenanceQuotationUpdateRequest;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response.MaintenanceQuotationCreateResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response.MaintenanceQuotationDetailResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.dto.response.MaintenanceQuotationHistoryDetailResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.dto.response.MaintenanceQuotationHistoryListResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.service.MaintenanceQuotationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

@Tag(name = "Maintenance Quotation", description = "유지보수 견적서 API")
@RestController
@RequestMapping("/maintenances/quotations")
@RequiredArgsConstructor
public class MaintenanceQuotationController {

    private final MaintenanceQuotationService quotationService;

    @Operation(summary = "유지보수 견적서 등록")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE_QUOTATION', 'CREATE')")
    public ResponseEntity<ApiResponse<MaintenanceQuotationCreateResponse>> register(
            @Valid @RequestBody MaintenanceQuotationCreateRequest dto) {
        MaintenanceQuotationCreateResponse response = quotationService.register(dto);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "유지보수 견적서 수정")
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE_QUOTATION', 'UPDATE')")
    public ResponseEntity<ApiResponse<MaintenanceQuotationDetailResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceQuotationUpdateRequest dto) {
        MaintenanceQuotationDetailResponse response = quotationService.update(id, dto);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "유지보수 견적서 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE_QUOTATION', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        quotationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "유지보수 견적서 상세 조회")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE_QUOTATION', 'READ')")
    public ResponseEntity<ApiResponse<MaintenanceQuotationDetailResponse>> getDetail(@PathVariable Long id) {
        MaintenanceQuotationDetailResponse response = quotationService.getDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "유지보수 견적서 히스토리 목록 조회")
    @GetMapping("/{id}/histories")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE_QUOTATION', 'READ')")
    public ResponseEntity<ApiResponse<List<MaintenanceQuotationHistoryListResponse>>> getHistories(@PathVariable Long id) {
        List<MaintenanceQuotationHistoryListResponse> response = quotationService.getHistories(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "유지보수 견적서 히스토리 상세 조회")
    @GetMapping("/histories/{historyId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE_QUOTATION', 'READ')")
    public ResponseEntity<ApiResponse<MaintenanceQuotationHistoryDetailResponse>> getHistoryDetail(@PathVariable Long historyId) {
        MaintenanceQuotationHistoryDetailResponse response = quotationService.getHistoryDetail(historyId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "유지보수 견적서 결재 상신")
    @PostMapping("/submit/{quotationId}")
    public ResponseEntity<ApiResponse<String>> submitMaintenanceQuotation(
            @PathVariable("quotationId") Long quotationId,
            @RequestBody @Valid SubmitRequest request
    ) {
        quotationService.submitMaintenanceQuotation(
                quotationId,
                request.getFirstApproverId()
        );

        return ResponseEntity.ok(ApiResponse.success("유지보수 견적서 결재 상신 완료"));
    }
}