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

    // 실제 AI 서버 호출과 응답 변환은 서비스 계층에 위임한다.
    private final ManagementReportService managementReportService;

    @Operation(summary = "RAG 기반 경영 리포트 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<ManagementReportResponse>> createReport(
            @Valid @RequestBody ManagementReportRequest request
    ) {
        // 표준 ApiResponse 포맷으로 감싸 프론트엔드가 일관된 응답 구조를 받도록 한다.
        return ResponseEntity.ok(ApiResponse.success(managementReportService.createReport(request)));
    }
}
