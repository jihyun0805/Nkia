package com.nkia.Orbis.domain.admin.workflow.dto.response;

import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLine;
import java.util.Comparator;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkflowResponse {

    private Long id;

    private String workflowDomain;

    private Boolean needNextApprover;

    private Long targetId;

    private String status;

    private Integer currentStepOrder;

    private List<WorkflowLineResponse> lines;

    public static WorkflowResponse from(
            Workflow workflow,
            boolean needNextApprover
    ) {
        return WorkflowResponse.builder()
                .id(workflow.getId())
                .workflowDomain(workflow.getWorkflowDomain().getDescription())
                .needNextApprover(needNextApprover)
                .targetId(workflow.getTargetId())
                .status(workflow.getStatus().getDescription())
                .currentStepOrder(workflow.getCurrentStepOrder())
                .lines(
                        workflow.getWorkflowLines()
                                .stream()
                                .sorted(Comparator.comparing(WorkflowLine::getStepOrder))
                                .map(WorkflowLineResponse::from)
                                .toList()
                )
                .build();
    }
}