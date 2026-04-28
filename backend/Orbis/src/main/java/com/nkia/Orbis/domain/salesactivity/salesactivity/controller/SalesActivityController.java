package com.nkia.Orbis.domain.salesactivity.salesactivity.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.salesactivity.salesactivity.dto.request.SalesActivityCreateRequest;
import com.nkia.Orbis.domain.salesactivity.salesactivity.service.SalesActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Sales Activity", description = "영업 활동 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/sales-activities")
public class SalesActivityController {
    private final SalesActivityService salesActivityService;

    @Operation(summary = "영업 활동 생성")
    @PostMapping
    public ApiResponse<Long> createSalesActivity(
            @Valid
            @RequestBody
            SalesActivityCreateRequest request
    ) {
        Long salesActivityId = salesActivityService.create(request);
        return ApiResponse.success(salesActivityId);
    }
}
