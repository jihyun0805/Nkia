package com.nkia.Orbis.domain.project.estimatedrevenue.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProductCategory {
    EMS("EMS"),
    ITG("ITG"),
    IOT("IoT"),
    ETC("기타"),
    EMS_MAINTENANCE("EMS 유지보수"),
    ITG_MAINTENANCE("ITG 유지보수");

    private final String description;
}
