package com.nkia.Orbis.domain.maintenance.customersupport.activity.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.service.CustomerSupportActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
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
    public ResponseEntity<ApiResponse<Long>> createActivity(@RequestBody CustomerSupportCreateRequest request) {

        Long activityId = activityService.createActivity(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(activityId));
    }
}
