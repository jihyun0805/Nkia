package com.nkia.Orbis.domain.maintenance.customersupport.activity.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ActivityType {
    REGULAR("정기점검"),
    REQUEST("요청");

    private final String description;
}