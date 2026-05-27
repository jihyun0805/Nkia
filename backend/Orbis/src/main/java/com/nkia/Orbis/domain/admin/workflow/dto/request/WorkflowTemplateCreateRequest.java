package com.nkia.Orbis.domain.admin.workflow.dto.request;

import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import java.util.List;
import lombok.Getter;

@Getter
public class WorkflowTemplateCreateRequest {

    private WorkflowDomain workflowDomain;

    private String name;

    private List<WorkflowStepCreateRequest> steps;
}
