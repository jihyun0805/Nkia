package com.nkia.Orbis.domain.project.projectresultreport.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.project.project.service.ProjectFacadeService;
import com.nkia.Orbis.domain.project.projectresultreport.dto.request.ProjectResultReportCreateRequest;
import com.nkia.Orbis.domain.project.projectresultreport.service.ProjectResultReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects/results")
@RequiredArgsConstructor
@Tag(name = "Project Result Report", description = "사업 결과보고서 API")
public class ProjectResultReportController {

    private final ProjectResultReportService reportService;

    /**
     * 결과보고 데이터 저장
     */
    @Operation(summary = "사업 결과 보고 등록")
    @PostMapping("/register")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT_RESULT', 'CREATE')")
    public ResponseEntity<ApiResponse<Long>> register(@Valid @RequestBody ProjectResultReportCreateRequest request) {
        Long reportId = reportService.registerResultReport(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(reportId));
    }

    /**
     * 사업 결과보고 삭제
     */
    @Operation(summary = "사업 결과 보고 삭제")
    @DeleteMapping("/{reportId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT_RESULT', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteResultReport(@PathVariable Long reportId) {
        reportService.deleteReport(reportId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}