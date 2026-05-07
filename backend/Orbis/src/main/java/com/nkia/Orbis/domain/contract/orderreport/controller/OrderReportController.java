package com.nkia.Orbis.domain.contract.orderreport.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.contract.orderreport.dto.request.OrderReportRequest;
import com.nkia.Orbis.domain.contract.orderreport.dto.response.OrderReportResponse;
import com.nkia.Orbis.domain.contract.orderreport.service.OrderReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Order Report", description = "수주보고서 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/contract/order-reports")
public class OrderReportController {

    private final OrderReportService orderReportService;

    @Operation(summary = "수주보고서 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<OrderReportResponse>> createOrderReport(
            @Valid
            @RequestBody
            OrderReportRequest request
    ) {
        OrderReportResponse response = orderReportService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }
}