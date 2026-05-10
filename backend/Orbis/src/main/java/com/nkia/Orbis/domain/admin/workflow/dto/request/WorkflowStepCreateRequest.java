package com.nkia.Orbis.domain.admin.workflow.dto.request;

import com.nkia.Orbis.domain.admin.user.entity.Position;
import lombok.Getter;

@Getter
public class WorkflowStepCreateRequest {

    private Integer stepOrder;

    private String stepName;

    private Position approverPosition;

    private Boolean required;
}
