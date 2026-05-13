package com.nkia.Orbis.domain.maintenance.maintenance.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.SubmitRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.request.MaintenanceCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.request.MaintenanceUpdateRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.response.MaintenanceDetailResponse;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.response.MaintenanceListResponse;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import com.nkia.Orbis.domain.maintenance.maintenance.service.MaintenanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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

@Tag(name = "Maintenance", description = "유지보수 API")
@RestController
@RequestMapping("/maintenances")
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    /**
     * 유지보수 (무상/유상) 신규 등록
     */
    @Operation(summary = "유지보수 등록")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE', 'CREATE')")
    public ResponseEntity<ApiResponse<Long>> register(
            @RequestBody @Valid MaintenanceCreateRequest request) {
        Long maintenanceId = maintenanceService.maintenanceRegister(request);

        return ResponseEntity.ok(ApiResponse.success(maintenanceId));
    }

    /**
     * 유지보수 정보 수정
     */
    @Operation(summary = "유지보수 수정")
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE', 'UPDATE')")
    public ResponseEntity<ApiResponse<MaintenanceDetailResponse>> update(
            @PathVariable Long id,
            @RequestBody MaintenanceUpdateRequest request) {
        MaintenanceDetailResponse response = maintenanceService.updateMaintenance(id, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 유지보수 정보 삭제
     */
    @Operation(summary = "유지보수 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        maintenanceService.deleteMaintenance(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 유지보수 상세 조회
     */
    @Operation(summary = "유지보수 상세 조회")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE', 'READ')")
    public ResponseEntity<ApiResponse<MaintenanceDetailResponse>> getDetail(@PathVariable Long id) {
        MaintenanceDetailResponse response = maintenanceService.getMaintenanceDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 무상 유지보수 현황 목록 조회
     */
    @Operation(summary = "무상 유지보수 목록 조회")
    @GetMapping("/free")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE', 'READ')")
    public ResponseEntity<ApiResponse<List<MaintenanceListResponse>>> getFreeList() {
        List<MaintenanceListResponse> response = maintenanceService.getMaintenanceList(MaintenanceType.FREE);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 유상 유지보수 현황 목록 조회
     */
    @Operation(summary = "유상 유지보수 목록 조회")
    @GetMapping("/paid")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'MAINTENANCE', 'READ')")
    public ResponseEntity<ApiResponse<List<MaintenanceListResponse>>> getPaidList() {
        List<MaintenanceListResponse> response = maintenanceService.getMaintenanceList(MaintenanceType.PAID);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "유지보수 결재 상신")
    @PostMapping("/submit/{maintenanceId}")
    public ResponseEntity<ApiResponse<String>> submitMaintenance(
            @PathVariable("maintenanceId") Long maintenanceId,
            @RequestBody SubmitRequest request
    ) {
        maintenanceService.submitMaintenance(
                maintenanceId,
                request.getFirstApproverId()
        );

        return ResponseEntity.ok(ApiResponse.success("유지보수 결재 상신 완료"));
    }
}