package com.nkia.Orbis.domain.maintenance.maintenance.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum InspectionCycle {
    MONTHLY("월"),
    QUARTERLY("분기"),
    SEMI_ANNUALLY("반기"),
    NONE("없음");

    private final String description;
}
