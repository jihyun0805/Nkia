package com.nkia.Orbis.domain.contract.purchase.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.contract.purchase.dto.response.PurchaseResponse;
import com.nkia.Orbis.domain.contract.purchase.service.PurchaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Purchase", description = "매입계약 관리 API")
@RestController
@RequestMapping("/contract/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;

    @Operation(summary = "매입계약 목록 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'CONTRACT', 'READ')")
    public ResponseEntity<ApiResponse<List<PurchaseResponse>>> getLicenses() {
        List<PurchaseResponse> response = purchaseService.getPurchases();

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
