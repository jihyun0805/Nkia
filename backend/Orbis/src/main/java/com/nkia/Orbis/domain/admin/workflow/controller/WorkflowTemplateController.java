package com.nkia.Orbis.domain.admin.workflow.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowTemplateCreateRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowTemplateUpdateRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.response.WorkflowTemplateListResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.response.WorkflowTemplateResponse;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/workflow-templates")
@Tag(name = "Workflow Template", description = "워크플로우 템플릿 API")
public class WorkflowTemplateController {

    private final WorkflowTemplateService workflowTemplateService;

    @Operation(summary = "결재 프로세스 생성")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'WORKFLOW_TEMPLATE', 'CREATE')")
    public ResponseEntity<ApiResponse<WorkflowTemplateResponse>> create(
            @RequestBody WorkflowTemplateCreateRequest request
    ) {

        WorkflowTemplateResponse response = workflowTemplateService.create(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "결재 프로세스 수정")
    @PutMapping("/{workflowTemplateId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'WORKFLOW_TEMPLATE', 'UPDATE')")
    public ResponseEntity<ApiResponse<WorkflowTemplateResponse>> update(
            @PathVariable("workflowTemplateId") Long workflowTemplateId,
            @RequestBody WorkflowTemplateUpdateRequest request
    ) {
        WorkflowTemplateResponse response = workflowTemplateService.update(workflowTemplateId, request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "결재 프로세스 상세 조회")
    @GetMapping("/{workflowTemplateId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'WORKFLOW_TEMPLATE', 'READ')")
    public ResponseEntity<ApiResponse<WorkflowTemplateResponse>> getTemplate(
            @PathVariable("workflowTemplateId") Long workflowTemplateId
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        workflowTemplateService.getTemplate(workflowTemplateId)
                )
        );
    }

    @Operation(summary = "결재 프로세스 목록 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'WORKFLOW_TEMPLATE', 'READ')")
    public ResponseEntity<ApiResponse<List<WorkflowTemplateListResponse>>> getTemplates() {

        List<WorkflowTemplateListResponse> response = workflowTemplateService.getTemplates();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

}
