package com.nkia.Orbis.domain.project.estimatedrevenue.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.project.estimatedrevenue.dto.response.EstimatedRevenueResponse;
import com.nkia.Orbis.domain.project.estimatedrevenue.service.ProjectRevenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사업 매출 분석 및 예상 실적 조회를 담당하는 컨트롤러
 */
@Tag(name = "EstimatedRevenue", description = "예상 매출액 API")
@RestController
@RequestMapping("/projects/revenues")
@RequiredArgsConstructor
public class ProjectRevenueController {

    private final ProjectRevenueService revenueService;

    @Operation(summary = "전사 예상 매출액 조회")
    @GetMapping("/annual")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT', 'READ')")
    public ResponseEntity<ApiResponse<List<EstimatedRevenueResponse>>> getAnnualRevenueStatus(
            @RequestParam(required = false) Integer year) {
        int targetYear = (year != null) ? year : LocalDate.now().getYear();
        List<EstimatedRevenueResponse> response = revenueService.getAnnualRevenue(targetYear);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
