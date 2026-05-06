package com.nkia.Orbis.domain.maintenance.customersupport.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ApprovalStatus {
    PENDING("대기"),
    APPROVED("승인"),
    REJECTED("반려");

    private final String description;
}