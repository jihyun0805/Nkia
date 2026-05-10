package com.nkia.Orbis.domain.contract.orderreport.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.contract.orderreport.dto.request.OrderReportRequest;
import com.nkia.Orbis.domain.contract.orderreport.dto.response.OrderReportListResponse;
import com.nkia.Orbis.domain.contract.orderreport.dto.response.OrderReportResponse;
import com.nkia.Orbis.domain.contract.orderreport.service.OrderReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @Operation(summary = "수주보고서 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderReportListResponse>>> getOrderReports() {
        List<OrderReportListResponse> response = orderReportService.getOrderReports();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "수주보고서 상세 조회")
    @GetMapping("/{orderReportId}")
    public ResponseEntity<ApiResponse<OrderReportResponse>> getOrderReport(
            @PathVariable("orderReportId") Long orderReportId
    ) {
        OrderReportResponse response = orderReportService.getOrderReport(orderReportId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "수주보고서 삭제")
    @DeleteMapping("/{orderReportId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable("orderReportId") Long orderReportId
    ) {
        orderReportService.delete(orderReportId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "수주보고서 수정")
    @PutMapping("/{orderReportId}")
    public ResponseEntity<ApiResponse<OrderReportResponse>> update(
            @PathVariable("orderReportId") Long orderReportId,
            @RequestBody OrderReportRequest request
    ) {
        OrderReportResponse response = orderReportService.update(orderReportId, request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}