package com.nkia.Orbis.domain.maintenance.maintenancequotation.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request.MaintenanceQuotationCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request.MaintenanceQuotationUpdateRequest;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response.MaintenanceQuotationCreateResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response.MaintenanceQuotationDetailResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.service.MaintenanceQuotationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<ApiResponse<MaintenanceQuotationCreateResponse>> register(
            @Valid @RequestBody MaintenanceQuotationCreateRequest dto) {
        MaintenanceQuotationCreateResponse response = quotationService.register(dto);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 특정 유지보수 견적서 수정
     */
    @Operation(summary = "유지보수 견적서 수정")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MaintenanceQuotationDetailResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceQuotationUpdateRequest dto) {
        MaintenanceQuotationDetailResponse response = quotationService.update(id, dto);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}