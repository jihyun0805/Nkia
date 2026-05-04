package com.nkia.Orbis.domain.productmodule.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.productmodule.dto.request.ProductModuleCreateRequest;
import com.nkia.Orbis.domain.productmodule.dto.response.ProductModuleResponse;
import com.nkia.Orbis.domain.productmodule.service.ProductModuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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
            ProductModuleCreateRequest request
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
}
