package com.nkia.Orbis.domain.admin.productmodule.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.productmodule.dto.request.ProductModuleRequest;
import com.nkia.Orbis.domain.admin.productmodule.dto.response.ProductModuleResponse;
import com.nkia.Orbis.domain.admin.productmodule.service.ProductModuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Product Module", description = "제품 모듈 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/product-modules")
public class ProductModuleController {
    private final ProductModuleService productModuleService;

    @Operation(summary = "제품 모듈 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<ProductModuleResponse>> createProductModule(
            @Valid
            @RequestBody
            ProductModuleRequest request
    ) {
        ProductModuleResponse response = productModuleService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "제품 모듈 삭제")
    @DeleteMapping("/{productModuleId}")
    public ResponseEntity<ApiResponse<Void>> deleteProductModule(
            @PathVariable("productModuleId") Long productModuleId
    ) {
        productModuleService.delete(productModuleId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "제품 모듈 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductModuleResponse>>> getProductModules() {
        List<ProductModuleResponse> response = productModuleService.getProductModules();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "제품 모듈 수정")
    @PatchMapping("/{productModuleId}")
    public ResponseEntity<ApiResponse<ProductModuleResponse>> updateProductModule(
            @PathVariable("productModuleId") Long productModuleId,
            @RequestBody ProductModuleRequest request
    ) {
        ProductModuleResponse response = productModuleService.update(productModuleId, request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
