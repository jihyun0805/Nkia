package com.nkia.Orbis.domain.admin.workflow.dto.request;

import java.util.UUID;
import lombok.Getter;

@Getter
public class WorkflowApproveRequest {

    private UUID nextApproverId;

    private String comment;
}
