package com.nkia.Orbis.domain.maintenance.customersupport.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RequestType {
    REGULAR("정기점검"),
    REQUEST("요청");

    private final String description;
}