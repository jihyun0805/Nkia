package com.nkia.Orbis.domain.projectopportunity.projectopportunity.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request.ProjectOpportunityCreateRequest;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request.ProjectOpportunityUpdateRequest;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.response.ProjectOpportunityResponse;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.service.ProjectOpportunityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@Tag(name = "Project Opportunity", description = "사업 기회 관련 API")
@RequestMapping("/project-opportunities")
public class ProjectOpportunityController {

    private final ProjectOpportunityService projectOpportunityService;

    /**
     * 1. 사업 기회 등록 (POST)
     *
     * @param request @Valid를 통해 DTO의 유효성 검사 수행
     * @return 201 Created와 생성된 데이터 반환
     */
    @Operation(summary = "사업 기회 등록")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT_OPPORTUNITY', 'CREATE')")
    public ResponseEntity<ApiResponse<ProjectOpportunityResponse>> createProjectOpportunity(
            @Valid @RequestBody ProjectOpportunityCreateRequest request) {
        ProjectOpportunityResponse response = projectOpportunityService.createProjectOpportunity(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /**
     * 2. 사업 기회 상세 조회 (GET)
     */
    @Operation(summary = "사업 기회 상세 조회")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT_OPPORTUNITY', 'READ')")
    public ResponseEntity<ApiResponse<ProjectOpportunityResponse>> getProjectOpportunity(@PathVariable Long id) {
        ProjectOpportunityResponse response = projectOpportunityService.getProjectOpportunity(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 3. 사업 기회 목록 조회 (GET)
     *
     * @param pageable 페이징 및 정렬 파라미터 (기본값: 최신순 정렬)
     */
    @Operation(summary = "사업 기회 목록 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT_OPPORTUNITY', 'READ')")
    public ResponseEntity<ApiResponse<Page<ProjectOpportunityResponse>>> getProjectOpportunityList(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ProjectOpportunityResponse> response = projectOpportunityService.getProjectOpportunityList(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 4. 사업 기회 정보 수정 (PUT)
     */
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT_OPPORTUNITY', 'UPDATE')")
    @Operation(summary = "사업 기회 정보 수정")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectOpportunityResponse>> updateProjectOpportunity(
            @PathVariable Long id,
            @Valid @RequestBody ProjectOpportunityUpdateRequest request) {
        ProjectOpportunityResponse response = projectOpportunityService.updateProjectOpportunity(id, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 5. 사업 기회 삭제 (DELETE) Soft Delete 방식이므로 실제 데이터는 남지만 논리적으로 삭제됨
     */
    @Operation(summary = "사업 기회 정보 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT_OPPORTUNITY', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteProjectOpportunity(@PathVariable Long id) {
        projectOpportunityService.deleteProjectOpportunity(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}