package com.nkia.Orbis.domain.maintenance.maintenance.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.request.MaintenanceCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.service.MaintenanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
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
    public ResponseEntity<ApiResponse<Long>> register(
            @RequestBody @Valid MaintenanceCreateRequest request) {
        Long maintenanceId = maintenanceService.maintenanceRegister(request);

        return ResponseEntity.ok(ApiResponse.success(maintenanceId));
    }
}