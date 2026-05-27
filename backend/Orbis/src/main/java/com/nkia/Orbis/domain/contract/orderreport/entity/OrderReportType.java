package com.nkia.Orbis.domain.contract.orderreport.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderReportType {
    SOLUTION("솔루션"),
    MAINTENANCE("유지보수"),
    SERVICE("용역");

    private final String description;
}
