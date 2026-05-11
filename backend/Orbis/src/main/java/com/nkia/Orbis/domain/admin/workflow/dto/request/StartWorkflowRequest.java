package com.nkia.Orbis.domain.admin.workflow.dto.request;

import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import java.util.UUID;
import lombok.Getter;

@Getter
public class StartWorkflowRequest {

    private WorkflowDomain workflowDomain;

    private Long targetId;

    private UUID requesterId;

    private UUID firstApproverId;
}
