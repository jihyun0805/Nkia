package com.nkia.Orbis.domain.project.projectresultreport.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.project.projectresultreport.dto.request.ProjectResultReportCreateRequest;
import com.nkia.Orbis.domain.project.projectresultreport.service.ProjectResultReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
     * 실제 결과보고 데이터를 저장하는 API
     */
    @Operation(summary = "사업 결과 보고 등록")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@Valid @RequestBody ProjectResultReportCreateRequest request) {
        reportService.registerResultReport(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("사업 결과가 성공적으로 등록되었습니다."));
    }
}
