package com.nkia.Orbis.domain.admin.workflow.dto.response;

import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLine;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLineStatus;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MyWorkflowResponse {

    private Long workflowId;

    private WorkflowDomain workflowDomain;

    private Long targetId;

    private WorkflowStatus workflowStatus;

    private Integer currentStepOrder;

    private String currentStepName;

    private WorkflowLineStatus lineStatus;

    private String type; // REQUESTED or APPROVAL_PENDING

    public static MyWorkflowResponse requested(Workflow workflow) {
        return MyWorkflowResponse.builder()
                .workflowId(workflow.getId())
                .workflowDomain(workflow.getWorkflowDomain())
                .targetId(workflow.getTargetId())
                .workflowStatus(workflow.getStatus())
                .currentStepOrder(workflow.getCurrentStepOrder())
                .type("REQUESTED")
                .build();
    }

    public static MyWorkflowResponse pending(WorkflowLine line) {
        Workflow workflow = line.getWorkflow();

        return MyWorkflowResponse.builder()
                .workflowId(workflow.getId())
                .workflowDomain(workflow.getWorkflowDomain())
                .targetId(workflow.getTargetId())
                .workflowStatus(workflow.getStatus())
                .currentStepOrder(workflow.getCurrentStepOrder())
                .currentStepName(line.getWorkflowStep().getStepName())
                .lineStatus(line.getStatus())
                .type("APPROVAL_PENDING")
                .build();
    }
}
