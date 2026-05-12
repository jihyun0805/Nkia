package com.nkia.Orbis.domain.contract.license.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.SubmitRequest;
import com.nkia.Orbis.domain.contract.license.dto.request.LicenseRequest;
import com.nkia.Orbis.domain.contract.license.dto.request.LicenseUpdateRequest;
import com.nkia.Orbis.domain.contract.license.dto.response.LicenseListResponse;
import com.nkia.Orbis.domain.contract.license.dto.response.LicenseResponse;
import com.nkia.Orbis.domain.contract.license.service.LicenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "License", description = "라이선스 관리 API")
@RestController
@RequestMapping("/contract/licenses")
@RequiredArgsConstructor
public class LicenseController {

    private final LicenseService licenseService;

    @Operation(summary = "라이선스 생성")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'LICENSE', 'CREATE')")
    public ResponseEntity<ApiResponse<LicenseResponse>> createLicense(
            @Valid
            @RequestBody
            LicenseRequest request
    ) {
        LicenseResponse response = licenseService.create(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "라이선스 목록 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'LICENSE', 'READ')")
    public ResponseEntity<ApiResponse<List<LicenseListResponse>>> getLicenses() {
        List<LicenseListResponse> response = licenseService.getLicenses();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "라이선스 상세 조회")
    @GetMapping("/{licenseId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'LICENSE', 'READ')")
    public ResponseEntity<ApiResponse<LicenseResponse>> getLicense(
            @PathVariable("licenseId") Long licenseId
    ) {
        LicenseResponse response = licenseService.getLicense(licenseId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "라이선스 삭제")
    @DeleteMapping("/{licenseId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'LICENSE', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable("licenseId") Long licenseId
    ) {
        licenseService.delete(licenseId);

        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "라이선스 수정")
    @PatchMapping("/{licenseId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'LICENSE', 'UPDATE')")
    public ResponseEntity<ApiResponse<LicenseResponse>> update(
            @PathVariable("licenseId") Long licenseId,
            @RequestBody LicenseUpdateRequest request
    ) {
        LicenseResponse response = licenseService.update(licenseId, request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "라이선스 결재 상신")
    @PostMapping("/submit/{licenseId}")
    public ResponseEntity<ApiResponse<String>> submitLicense(
            @PathVariable("licenseId") Long licenseId,
            @RequestBody SubmitRequest request
    ) {
        licenseService.submitLicense(
                licenseId,
                request.getFirstApproverId()
        );

        return ResponseEntity.ok(ApiResponse.success("라이선스 결재 상신 완료"));
    }
}
