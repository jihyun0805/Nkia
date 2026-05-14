package com.nkia.Orbis.domain.maintenance.customersupport.activity.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportUpdateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response.CustomerSupportDetailResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response.IntegratedSupportListResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.service.CustomerSupportActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/maintenances/customer-supports/activities")
@RequiredArgsConstructor
@Tag(name = "Customer Support", description = "고객지원 활동 결과 관리 API")
public class CustomerSupportActivityController {

    private final CustomerSupportActivityService activityService;

    @Operation(summary = "고객지원 활동 결과 생성")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'CREATE')")
    public ResponseEntity<ApiResponse<Long>> createActivity(@RequestBody CustomerSupportCreateRequest request) {

        Long activityId = activityService.createActivity(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(activityId));
    }

    /**
     * 고객지원 활동 결과 수정
     */
    @Operation(summary = "고객지원 활동 결과 수정")
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'UPDATE')")
    public ResponseEntity<ApiResponse<CustomerSupportDetailResponse>> updateActivity(
            @PathVariable Long id,
            @RequestBody CustomerSupportUpdateRequest request) {

        CustomerSupportDetailResponse response = activityService.updateActivity(id, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 고객지원 활동 결과 삭제
     */
    @Operation(summary = "고객지원 활동 결과 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteActivity(@PathVariable Long id) {
        activityService.deleteActivity(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 고객지원 통합 현황 목록 조회
     */
    @Operation(summary = "고객지원 통합 현황 조회")
    @GetMapping("/integrated-status")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'READ')")
    public ResponseEntity<ApiResponse<List<IntegratedSupportListResponse>>> getIntegratedStatus() {
        return ResponseEntity.ok(ApiResponse.success(activityService.getIntegratedStatus()));
    }

    /**
     * 고객지원 활동 결과 상세 조회
     */
    @Operation(summary = "고객지원 활동 결과 상세 조회")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'READ')")
    public ResponseEntity<ApiResponse<CustomerSupportDetailResponse>> getDetail(
            @PathVariable Long id) {

        CustomerSupportDetailResponse response = activityService.getActivityDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
