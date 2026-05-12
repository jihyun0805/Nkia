package com.nkia.Orbis.domain.project.estimatedrevenue.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.project.estimatedrevenue.dto.response.EstimatedRevenueResponse;
import com.nkia.Orbis.domain.project.estimatedrevenue.service.ProjectRevenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사업 매출 분석 및 예상 실적 조회를 담당하는 컨트롤러입니다.
 */
@Tag(name = "EstimatedRevenue", description = "예상 매출액 API")
@RestController
@RequestMapping("/projects/{projectId}/revenues")
@RequiredArgsConstructor
public class ProjectRevenueController {

    private final OrderReportRepository orderReportRepository;
    private final ProjectRevenueService revenueService;

    @Operation(summary = "전사 예상 매출액 조회", description = "2026년에 걸쳐 있는 수주보고서들의 금액을 월별로 합산합니다.")
    @GetMapping("/annual")
    public ResponseEntity<ApiResponse<List<EstimatedRevenueResponse>>> getAnnualRevenueStatus(
            @Parameter(description = "조회할 연도 (예: 2026). 미입력 시 올해", example = "2026")
            @RequestParam(required = false) Integer year) {

        int targetYear = (year != null) ? year : LocalDate.now().getYear();

        LocalDate startOfYear = LocalDate.of(targetYear, 1, 1);
        LocalDate endOfYear = LocalDate.of(targetYear, 12, 31);

        List<OrderReport> activeReports = orderReportRepository.findAllOverlappingYear(startOfYear, endOfYear);

        List<EstimatedRevenueResponse> response = revenueService.calculateTotalRevenue(activeReports, targetYear);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
