package com.nkia.Orbis.domain.maintenance.customersupport.request.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestUpdateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response.CustomerSupportRequestDetailResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.request.service.CustomerSupportRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<ApiResponse<Long>> createRequest(@RequestBody CustomerSupportRequestCreateRequest request) {

        Long requestId = customerSupportRequestService.createRequest(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(requestId));
    }

    /**
     * 고객지원 요청 수정 API
     */
    @Operation(summary = "고객지원 요청 수정")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerSupportRequestDetailResponse>> updateRequest(
            @PathVariable Long id,
            @RequestBody CustomerSupportRequestUpdateRequest request) {

        CustomerSupportRequestDetailResponse response = customerSupportRequestService.updateRequest(id, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
