package com.nkia.Orbis.domain.company.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.company.dto.request.CompanyCreateRequest;
import com.nkia.Orbis.domain.company.dto.request.CompanyUpdateRequest;
import com.nkia.Orbis.domain.company.dto.response.CompanyResponse;
import com.nkia.Orbis.domain.company.entity.CompanyType;
import com.nkia.Orbis.domain.company.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "Company", description = "회사 관련 API")
@RequestMapping("/companies") // 기본 리소스 경로
public class CompanyController {

    private final CompanyService companyService;

    /**
     * 신규 고객사/협력사 등록 URI: POST /companies
     */
    @Operation(summary = "회사 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createCompany(
            @Valid @RequestBody CompanyCreateRequest request) { // @Valid로 DTO의 제약조건 검증

        Long companyId = companyService.createCompany(request);

        // 201 Created 반환
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(companyId));
    }

    /**
     * 회사 정보 수정 URI: PUT /companies/{companyId}
     */
    @Operation(summary = "회사 정보 수정")
    @PutMapping("/{companyId}")
    public ResponseEntity<ApiResponse<Void>> updateCompany(
            @PathVariable Long companyId,
            @Valid @RequestBody CompanyUpdateRequest request) {

        companyService.updateCompany(companyId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 회사 논리적 삭제 (Soft Delete) URI: DELETE /companies/{companyId}
     */
    @Operation(summary = "회사 정보 삭제")
    @DeleteMapping("/{companyId}")
    public ResponseEntity<ApiResponse<Void>> deleteCompany(@PathVariable Long companyId) {

        companyService.deleteCompany(companyId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 회사 단건 상세 조회 URI: GET /companies/{companyId}
     */
    @Operation(summary = "회사 상세 정보 조회")
    @GetMapping("/{companyId}")
    public ResponseEntity<ApiResponse<CompanyResponse>> getCompany(@PathVariable Long companyId) {

        CompanyResponse response = companyService.getCompany(companyId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 회사 목록 다조건 페이징 조회 (고객사/협력사 분리 가능) URI: GET /companies?type=CUSTOMER&page=0&size=10
     */
    @Operation(summary = "회사 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CompanyResponse>>> getCompanies(
            @RequestParam(required = false) CompanyType type, // 필수가 아니므로 null 허용
            @PageableDefault(size = 10) Pageable pageable) {  // 악의적인 대량 조회 방지

        Page<CompanyResponse> responsePage = companyService.getCompanies(type, pageable);
        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }
}