package com.nkia.Orbis.domain.project.project.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.project.project.dto.request.ProjectCombinedUpdateRequest;
import com.nkia.Orbis.domain.project.project.dto.request.ProjectCreateRequest;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectCreateResponse;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectDetailResponse;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectHistoryDetailResponse;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectHistoryListResponse;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectListResponse;
import com.nkia.Orbis.domain.project.project.service.ProjectFacadeService;
import com.nkia.Orbis.domain.project.project.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import java.util.List;
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
@RequestMapping("/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "사업 API")
public class ProjectController {
    private final ProjectService projectService;
    private final ProjectFacadeService projectFacadeService;

    /**
     * 사업 등록
     */
    @Operation(summary = "사업 등록")
    @PostMapping("/register")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT', 'CREATE')")
    public ResponseEntity<ApiResponse<ProjectCreateResponse>> registerProject(@Valid @RequestBody ProjectCreateRequest request) {
        ProjectCreateResponse response = projectService.registerProject(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response));
    }

    /**
     * 사업 목록 조회
     */
    @Operation(summary = "사업 목록 전체 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT', 'READ')")
    public ResponseEntity<ApiResponse<List<ProjectListResponse>>> getProjects() {
        List<ProjectListResponse> response = projectService.getProjects();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 사업 상세 조회
     */
    @Operation(summary = "사업 상세 조회")
    @GetMapping("/{projectId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT', 'READ')")
    public ResponseEntity<ApiResponse<ProjectDetailResponse>> getProjectDetail(@PathVariable Long projectId) {
        ProjectDetailResponse response = projectService.getProjectDetail(projectId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 사업 및 결과보고 수정
     */
    @PutMapping("/{projectId}/with-report")
    @Operation(summary = "사업 통합 수정")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT', 'UPDATE')")
    public ResponseEntity<ApiResponse<ProjectDetailResponse>> updateProjectWithReport(
            @PathVariable Long projectId,
            @RequestBody ProjectCombinedUpdateRequest request) {

        ProjectDetailResponse response = projectFacadeService.updateProjectWithReport(projectId, request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 사업 삭제
     */
    @Operation(summary = "사업 삭제")
    @DeleteMapping("/{projectId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@PathVariable Long projectId) {
        projectService.deleteProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 사업 이력(히스토리) 목록 조회
     */
    @Operation(summary = "사업 이력(히스토리) 목록 조회")
    @GetMapping("/{projectId}/histories")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT', 'READ')")
    public ResponseEntity<ApiResponse<List<ProjectHistoryListResponse>>> getProjectHistories(
            @PathVariable Long projectId) {
        List<ProjectHistoryListResponse> response = projectService.getProjectHistories(projectId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 사업 이력(히스토리) 상세 조회
     */
    @Operation(summary = "사업 이력(히스토리) 상세 조회")
    @GetMapping("/histories/{historyId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROJECT', 'READ')")
    public ResponseEntity<ApiResponse<ProjectHistoryDetailResponse>> getProjectHistoryDetail(
            @PathVariable Long historyId) {
        ProjectHistoryDetailResponse response = projectService.getProjectHistoryDetail(historyId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
