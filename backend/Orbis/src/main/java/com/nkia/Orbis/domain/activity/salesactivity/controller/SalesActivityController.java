package com.nkia.Orbis.domain.activity.salesactivity.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.activity.salesactivity.dto.request.SalesActivityCreateRequest;
import com.nkia.Orbis.domain.activity.salesactivity.dto.request.SalesActivityUpdateRequest;
import com.nkia.Orbis.domain.activity.salesactivity.dto.response.SalesActivityResponse;
import com.nkia.Orbis.domain.activity.salesactivity.service.SalesActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "영업 활동 수정")
    @PatchMapping("/activity/{salesActivityId}")
    public ResponseEntity<ApiResponse<SalesActivityResponse>> updateSalesActivity(
            @PathVariable("salesActivityId") Long salesActivityId,
            @RequestBody SalesActivityUpdateRequest request
    ) {
        SalesActivityResponse response = salesActivityService.update(salesActivityId, request);
        return ResponseEntity.ok(ApiResponse.success(response));

    }
}
