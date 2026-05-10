package com.nkia.Orbis.domain.admin.workflow.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.StartWorkflowRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowApproveRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowRejectRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.response.WorkflowResponse;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/workflows")
@Tag(name = "Workflow", description = "워크플로우 결재 API")
public class WorkflowController {

    private final WorkflowService workflowService;

    @Operation(summary = "초기 결재 요청 생성")
    @PostMapping("/start")
    public ResponseEntity<ApiResponse<WorkflowResponse>> start(
            @RequestBody StartWorkflowRequest request
    ) {
        Workflow workflow = workflowService.startWorkflow(
                request.getWorkflowDomain(),
                request.getTargetId(),
                request.getFirstApproverId()
        );

        return ResponseEntity.ok(
                ApiResponse.success(WorkflowResponse.from(workflow))
        );
    }

    @Operation(summary = "결재 승인")
    @PostMapping("/{workflowId}/approve")
    public ResponseEntity<ApiResponse<String>> approve(
            @PathVariable("workflowId") Long workflowId,
            @RequestBody WorkflowApproveRequest request
    ) {
        workflowService.approve(
                workflowId,
                request.getApproverId(),
                request.getNextApproverId(),
                request.getComment()
        );

        return ResponseEntity.ok(ApiResponse.success("승인 완료"));
    }

    @Operation(summary = "결재 반려")
    @PostMapping("/{workflowId}/reject")
    public ResponseEntity<ApiResponse<String>> reject(
            @PathVariable("workflowId") Long workflowId,
            @RequestBody WorkflowRejectRequest request
    ) {
        workflowService.reject(
                workflowId,
                request.getApproverId(),
                request.getComment()
        );

        return ResponseEntity.ok(ApiResponse.success("반려 완료"));
    }

    @Operation(summary = "결재 취소")
    @PostMapping("/{workflowId}/cancel")
    public ResponseEntity<ApiResponse<String>> cancel(
            @PathVariable("workflowId") Long workflowId
    ) {
        workflowService.cancel(workflowId);

        return ResponseEntity.ok(ApiResponse.success("취소 완료"));
    }

    @Operation(summary = "내 결재 목록 조회")
    @GetMapping("/my/{userId}")
    public ResponseEntity<ApiResponse<List<WorkflowResponse>>> getMyWorkflows(
            @PathVariable("userId") UUID userId
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        workflowService.getMyWorkflows(userId)
                )
        );
    }
}
