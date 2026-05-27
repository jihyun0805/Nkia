package com.nkia.Orbis.domain.admin.workflow.dto.response;

import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLine;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MyWorkflowResponse {

    private Long workflowId;

    private String workflowDomain;

    private Long targetId;

    private String workflowStatus;

    private Integer currentStepOrder;

    private String currentStepName;

    private String lineStatus;

    private String type;

    public static MyWorkflowResponse requested(Workflow workflow) {
        return MyWorkflowResponse.builder()
                .workflowId(workflow.getId())
                .workflowDomain(workflow.getWorkflowDomain().getDescription())
                .targetId(workflow.getTargetId())
                .workflowStatus(workflow.getStatus().getDescription())
                .currentStepOrder(workflow.getCurrentStepOrder())
                .type("REQUESTED")
                .build();
    }

    public static MyWorkflowResponse pending(WorkflowLine line) {
        Workflow workflow = line.getWorkflow();

        return MyWorkflowResponse.builder()
                .workflowId(workflow.getId())
                .workflowDomain(workflow.getWorkflowDomain().getDescription())
                .targetId(workflow.getTargetId())
                .workflowStatus(workflow.getStatus().getDescription())
                .currentStepOrder(workflow.getCurrentStepOrder())
                .currentStepName(line.getWorkflowStep().getStepName())
                .lineStatus(line.getStatus().getDescription())
                .type("APPROVAL_PENDING")
                .build();
    }
}
