package com.nkia.Orbis.domain.admin.workflow.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum WorkflowStatus {
    IN_PROGRESS("진행중"),
    APPROVED("승인"),
    REJECTED("반려"),
    CANCELED("취소");

    private final String description;
}
