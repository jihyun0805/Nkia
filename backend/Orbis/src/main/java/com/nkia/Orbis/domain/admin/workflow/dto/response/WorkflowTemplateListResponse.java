package com.nkia.Orbis.domain.admin.workflow.dto.response;

import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowTemplate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkflowTemplateListResponse {

    private Long id;

    private WorkflowDomain workflowDomain;

    private String name;

    private Boolean active;


    public static WorkflowTemplateListResponse from(
            WorkflowTemplate workflowTemplate
    ) {
        return WorkflowTemplateListResponse.builder()
                .id(workflowTemplate.getId())
                .workflowDomain(workflowTemplate.getWorkflowDomain())
                .name(workflowTemplate.getName())
                .active(workflowTemplate.getActive())
                .build();
    }
}
