package com.nkia.Orbis.domain.maintenance.customersupport.activity.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupportDataType {
    REQUEST("요청"),
    ACTIVITY("활동");

    private final String description;
}
