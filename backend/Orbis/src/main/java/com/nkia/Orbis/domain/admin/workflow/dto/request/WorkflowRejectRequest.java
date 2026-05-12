package com.nkia.Orbis.domain.admin.workflow.dto.request;

import java.util.UUID;
import lombok.Getter;

@Getter
public class WorkflowRejectRequest {

    private UUID approverId;

    private String comment;
}
