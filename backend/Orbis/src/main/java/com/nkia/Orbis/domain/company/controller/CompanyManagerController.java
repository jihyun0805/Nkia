package com.nkia.Orbis.domain.company.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.company.dto.request.CompanyManagerCreateRequest;
import com.nkia.Orbis.domain.company.dto.request.CompanyManagerUpdateRequest;
import com.nkia.Orbis.domain.company.dto.response.CompanyManagerResponse;
import com.nkia.Orbis.domain.company.service.CompanyManagerService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/companies") // 리소스 중심의 URL 설계
public class CompanyManagerController {

    private final CompanyManagerService companyManagerService;

    /**
     * 특정 고객사(협력사)에 담당자 등록 URI: POST /api/v1/companies/{companyId}/managers
     */
    @PostMapping("/{companyId}/managers")
    public ResponseEntity<ApiResponse<Long>> createManager(
            @PathVariable Long companyId,
            @Valid @RequestBody CompanyManagerCreateRequest request) { // @Valid로 DTO 검증 수행
        
        // 여기서는 클라이언트가 URL과 Body에 모두 명시한다고 가정합니다.
        Long managerId = companyManagerService.createManager(request, companyId);

        // 201 Created 상태 코드 반환
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(managerId));
    }

    /**
     * 담당자 정보 수정 URI: PUT /api/v1/companies/managers/{managerId}
     */
    @PutMapping("/managers/{managerId}")
    public ResponseEntity<ApiResponse<Void>> updateManager(
            @PathVariable Long managerId,
            @Valid @RequestBody CompanyManagerUpdateRequest request) {

        companyManagerService.updateManager(managerId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 담당자 논리적 삭제 (Soft Delete) URI: DELETE /api/v1/companies/managers/{managerId}
     */
    @DeleteMapping("/managers/{managerId}")
    public ResponseEntity<ApiResponse<Void>> deleteManager(@PathVariable Long managerId) {
        companyManagerService.deleteManager(managerId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 담당자 단건 상세 조회 URI: GET /api/v1/companies/managers/{managerId}
     */
    @GetMapping("/managers/{managerId}")
    public ResponseEntity<ApiResponse<CompanyManagerResponse>> getManager(@PathVariable Long managerId) {
        CompanyManagerResponse response = companyManagerService.getManager(managerId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 특정 회사의 담당자 목록 페이징 조회 URI: GET /api/v1/companies/{companyId}/managers?page=0&size=10
     */
    @GetMapping("/{companyId}/managers")
    public ResponseEntity<ApiResponse<Page<CompanyManagerResponse>>> getManagersByCompany(
            @PathVariable Long companyId,
            @PageableDefault(size = 10) Pageable pageable) {

        Page<CompanyManagerResponse> responsePage = companyManagerService.getManagersByCompany(companyId, pageable);
        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }
}