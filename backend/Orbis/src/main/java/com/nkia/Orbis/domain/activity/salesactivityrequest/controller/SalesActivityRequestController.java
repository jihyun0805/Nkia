package com.nkia.Orbis.domain.activity.salesactivityrequest.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.activity.salesactivityrequest.dto.request.SalesActivityRequestCreateRequest;
import com.nkia.Orbis.domain.activity.salesactivityrequest.dto.response.SalesActivityRequestListResponse;
import com.nkia.Orbis.domain.activity.salesactivityrequest.dto.response.SalesActivityRequestResponse;
import com.nkia.Orbis.domain.activity.salesactivityrequest.service.SalesActivityRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Sales Activity Request", description = "영업 활동 요청 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/activity/sales-activity-requests")
public class SalesActivityRequestController {

    private final SalesActivityRequestService salesActivityRequestService;

    @Operation(summary = "영업 활동 요청 생성")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'SALES_ACTIVITY_REQUEST', 'CREATE')")
    public ResponseEntity<ApiResponse<SalesActivityRequestResponse>> createSalesActivityRequest(
            @Valid
            @RequestBody
            SalesActivityRequestCreateRequest request
    ) {
        SalesActivityRequestResponse response = salesActivityRequestService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "영업 활동 요청 목록 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'SALES_ACTIVITY_REQUEST', 'READ')")
    public ResponseEntity<ApiResponse<List<SalesActivityRequestListResponse>>> getSalesActivityRequests() {
        List<SalesActivityRequestListResponse> response = salesActivityRequestService.getSalesActivityRequests();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "영업 활동 요청 상세 조회")
    @GetMapping("/{salesActivityRequestId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'SALES_ACTIVITY_REQUEST', 'READ')")
    public ResponseEntity<ApiResponse<SalesActivityRequestResponse>> getSalesActivityRequest(
            @PathVariable("salesActivityRequestId") Long salesActivityRequestId
    ) {
        SalesActivityRequestResponse response = salesActivityRequestService.getSalesActivityRequest(
                salesActivityRequestId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}