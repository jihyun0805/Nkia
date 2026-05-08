package com.nkia.Orbis.domain.project.project.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.project.project.dto.request.ProjectCreateRequest;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectListResponse;
import com.nkia.Orbis.domain.project.project.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "사업 API")
public class ProjectController {
    private final ProjectService projectService;

    @Operation(summary = "사업 등록")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Long>> registerProject(@Valid @RequestBody ProjectCreateRequest request) {
        Long projectId = projectService.registerProject(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(projectId));
    }

    /**
     * 사업 목록 조회 (페이징)
     */
    @Operation(summary = "사업 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProjectListResponse>>> getProjects(
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<ProjectListResponse> response = projectService.getProjects(pageable);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
