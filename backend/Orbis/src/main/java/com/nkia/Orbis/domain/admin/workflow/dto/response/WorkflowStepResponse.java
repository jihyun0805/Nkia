package com.nkia.Orbis.domain.admin.workflow.dto.response;

import com.nkia.Orbis.domain.admin.user.entity.Position;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStep;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkflowStepResponse {

    private Long id;

    private Integer stepOrder;

    private String stepName;

    private Position approverPosition;

    private Boolean required;

    private Boolean active;

    public static WorkflowStepResponse from(
            WorkflowStep workflowStep
    ) {
        return WorkflowStepResponse.builder()
                .id(workflowStep.getId())
                .stepOrder(workflowStep.getStepOrder())
                .stepName(workflowStep.getStepName())
                .approverPosition(workflowStep.getApproverPosition())
                .required(workflowStep.getRequired())
                .active(workflowStep.getActive())
                .build();
    }
}
