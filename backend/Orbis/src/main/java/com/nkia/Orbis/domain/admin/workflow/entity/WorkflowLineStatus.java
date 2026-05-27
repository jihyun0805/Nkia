package com.nkia.Orbis.domain.admin.workflow.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum WorkflowLineStatus {
    WAITING("승인 대기"),
    PENDING("진행중"),
    APPROVED("승인"),
    REJECTED("반려"),
    SKIPPED("스킵");

    private final String description;
}
