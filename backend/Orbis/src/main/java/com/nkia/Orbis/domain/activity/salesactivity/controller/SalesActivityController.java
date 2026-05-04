package com.nkia.Orbis.domain.activity.salesactivity.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.activity.salesactivity.dto.request.SalesActivityCreateRequest;
import com.nkia.Orbis.domain.activity.salesactivity.dto.request.SalesActivityUpdateRequest;
import com.nkia.Orbis.domain.activity.salesactivity.dto.response.SalesActivityListResponse;
import com.nkia.Orbis.domain.activity.salesactivity.dto.response.SalesActivityResponse;
import com.nkia.Orbis.domain.activity.salesactivity.service.SalesActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Sales Activity", description = "영업 활동 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/activity/sales-activities")
public class SalesActivityController {
    private final SalesActivityService salesActivityService;

    @Operation(summary = "영업 활동 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<SalesActivityResponse>> createSalesActivity(
            @Valid
            @RequestBody
            SalesActivityCreateRequest request
    ) {
        SalesActivityResponse response = salesActivityService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "영업 활동 수정")
    @PatchMapping("/{salesActivityId}")
    public ResponseEntity<ApiResponse<SalesActivityResponse>> updateSalesActivity(
            @PathVariable("salesActivityId") Long salesActivityId,
            @RequestBody SalesActivityUpdateRequest request
    ) {
        SalesActivityResponse response = salesActivityService.update(salesActivityId, request);
        return ResponseEntity.ok(ApiResponse.success(response));

    }

    @Operation(summary = "영업 활동 삭제")
    @DeleteMapping("/{salesActivityId}")
    public ResponseEntity<ApiResponse<Void>> deleteSalesActivity(
            @PathVariable("salesActivityId") Long salesActivityId
    ) {
        salesActivityService.delete(salesActivityId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "영업 활동 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<SalesActivityListResponse>>> getSalesActivities() {
        List<SalesActivityListResponse> response = salesActivityService.getSalesActivities();

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
