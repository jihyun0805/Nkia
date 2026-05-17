package com.nkia.Orbis.domain.admin.workflow.dto.response;

import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLine;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkflowLineResponse {

    private Integer stepOrder;

    private String stepName;

    private String approverName;

    private String approverPosition;

    private String status;

    private String comment;

    private LocalDateTime actedAt;

    public static WorkflowLineResponse from(
            WorkflowLine workflowLine
    ) {
        return WorkflowLineResponse.builder()
                .stepOrder(workflowLine.getStepOrder())
                .stepName(workflowLine.getWorkflowStep().getStepName())
                .approverName(workflowLine.getApprover().getName())
                .approverPosition(workflowLine.getApprover().getPosition().getDescription())
                .status(workflowLine.getStatus().getDescription())
                .comment(workflowLine.getComment())
                .actedAt(workflowLine.getActedAt())
                .build();
    }
}
