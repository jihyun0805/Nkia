package com.nkia.Orbis.domain.admin.workflow.dto.response;

import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowTemplate;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkflowTemplateResponse {

    private Long id;

    private WorkflowDomain workflowDomain;

    private String name;

    private Boolean active;

    private List<WorkflowStepResponse> steps;

    public static WorkflowTemplateResponse from(
            WorkflowTemplate workflowTemplate,
            List<WorkflowStepResponse> steps
    ) {
        return WorkflowTemplateResponse.builder()
                .id(workflowTemplate.getId())
                .workflowDomain(workflowTemplate.getWorkflowDomain())
                .name(workflowTemplate.getName())
                .active(workflowTemplate.getActive())
                .steps(steps)
                .build();
    }
}
