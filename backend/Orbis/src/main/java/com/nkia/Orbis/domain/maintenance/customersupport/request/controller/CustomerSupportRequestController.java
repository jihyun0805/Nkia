package com.nkia.Orbis.domain.maintenance.customersupport.request.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestUpdateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response.CustomerSupportRequestDetailResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response.CustomerSupportRequestListResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.request.service.CustomerSupportRequestService;
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
@RequestMapping("/maintenances/customer-supports/requests")
@RequiredArgsConstructor
@Tag(name = "Customer Support Request", description = "고객지원 요청 관리 API")
public class CustomerSupportRequestController {
    private final CustomerSupportRequestService customerSupportRequestService;

    @Operation(summary = "고객지원 요청 생성")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'CREATE')")
    public ResponseEntity<ApiResponse<Long>> createRequest(@RequestBody CustomerSupportRequestCreateRequest request) {

        Long requestId = customerSupportRequestService.createRequest(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(requestId));
    }

    /**
     * 고객지원 요청 수정
     */
    @Operation(summary = "고객지원 요청 수정")
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'UPDATE')")
    public ResponseEntity<ApiResponse<CustomerSupportRequestDetailResponse>> updateRequest(
            @PathVariable Long id,
            @RequestBody CustomerSupportRequestUpdateRequest request) {

        CustomerSupportRequestDetailResponse response = customerSupportRequestService.updateRequest(id, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 고객지원 요청 삭제
     */
    @Operation(summary = "고객지원 요청 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteRequest(@PathVariable Long id) {
        customerSupportRequestService.deleteRequest(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 고객지원 요청 목록 조회
     */
    @Operation(summary = "고객지원 요청 목록 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'READ')")
    public ResponseEntity<ApiResponse<List<CustomerSupportRequestListResponse>>> getRequests() {
        return ResponseEntity.ok(ApiResponse.success(customerSupportRequestService.getRequests()));
    }

    /**
     * 고객지원 요청 상세 조회
     */
    @Operation(summary = "고객지원 요청 상세 조회")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CUSTOMER_SUPPORT', 'READ')")
    public ResponseEntity<ApiResponse<CustomerSupportRequestDetailResponse>> getRequestDetail(
            @PathVariable Long id) {
        CustomerSupportRequestDetailResponse response = customerSupportRequestService.getRequestDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
