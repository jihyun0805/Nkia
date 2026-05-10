package com.nkia.Orbis.domain.admin.workflow.dto.response;

import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLine;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import java.util.Comparator;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkflowResponse {

    private Long id;

    private WorkflowDomain workflowDomain;

    private Long targetId;

    private WorkflowStatus status;

    private Integer currentStepOrder;

    private List<WorkflowLineResponse> lines;

    public static WorkflowResponse from(
            Workflow workflow
    ) {
        return WorkflowResponse.builder()
                .id(workflow.getId())
                .workflowDomain(workflow.getWorkflowDomain())
                .targetId(workflow.getTargetId())
                .status(workflow.getStatus())
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