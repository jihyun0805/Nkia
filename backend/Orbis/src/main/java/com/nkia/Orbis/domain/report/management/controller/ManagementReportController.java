package com.nkia.Orbis.domain.report.management.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.report.management.dto.request.ManagementReportRequest;
import com.nkia.Orbis.domain.report.management.dto.response.ManagementReportResponse;
import com.nkia.Orbis.domain.report.management.service.ManagementReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports/management")
@RequiredArgsConstructor
@Tag(name = "Management Report", description = "RAG 기반 경영 리포트 API")
public class ManagementReportController {

    private final ManagementReportService managementReportService;

    @Operation(summary = "RAG 기반 경영 리포트 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<ManagementReportResponse>> createReport(
            @Valid @RequestBody ManagementReportRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(managementReportService.createReport(request)));
    }
}
