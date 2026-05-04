package com.nkia.Orbis.domain.maintenance.maintenance.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MaintenanceType {

    FREE("무상"),
    PAID("유상");

    private final String description;
}