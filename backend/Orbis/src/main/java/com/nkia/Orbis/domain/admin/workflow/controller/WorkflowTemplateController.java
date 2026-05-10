package com.nkia.Orbis.domain.admin.workflow.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowTemplateCreateRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.response.WorkflowTemplateResponse;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
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
    public ResponseEntity<ApiResponse<WorkflowTemplateResponse>> create(
            @RequestBody WorkflowTemplateCreateRequest request
    ) {

        WorkflowTemplateResponse response = workflowTemplateService.create(request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
