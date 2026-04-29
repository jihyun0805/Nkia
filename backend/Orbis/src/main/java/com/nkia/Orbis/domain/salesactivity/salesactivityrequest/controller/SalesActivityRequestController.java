//package com.nkia.Orbis.domain.salesactivity.salesactivityrequest.controller;
//
//import com.nkia.Orbis.common.response.ApiResponse;
//import com.nkia.Orbis.domain.salesactivity.salesactivity.dto.request.SalesActivityCreateRequest;
//import com.nkia.Orbis.domain.salesactivity.salesactivity.dto.response.SalesActivityResponse;
//import com.nkia.Orbis.domain.salesactivity.salesactivity.service.SalesActivityService;
//import com.nkia.Orbis.domain.salesactivity.salesactivityrequest.service.SalesActivityRequestService;
//import io.swagger.v3.oas.annotations.Operation;
//import io.swagger.v3.oas.annotations.tags.Tag;
//import jakarta.validation.Valid;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestBody;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RestController;
//
//@Tag(name = "Sales Activity Request", description = "영업 활동 요청 관리 API")
//@RestController
//@RequiredArgsConstructor
//@RequestMapping("/sales-activity/request")
//public class SalesActivityRequestController {
//
//    private final SalesActivityRequestService salesActivityRequestService;
//
//    @Operation(summary = "영업 활동 요청 생성")
//    @PostMapping
//    public ResponseEntity<ApiResponse<SalesActivityRequestResponse>> cre
//}
//
//    public ResponseEntity<ApiResponse<SalesActivityResponse>> createSalesActivity(
//            @Valid
//            @RequestBody
//            SalesActivityCreateRequest request
//    ) {
//        SalesActivityResponse response = salesActivityService.create(request);
//        return ResponseEntity.ok(ApiResponse.success(response));
//    }