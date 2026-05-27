package com.nkia.Orbis.domain.contract.orderreport.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum VisitCycle {
    MONTHLY("월"),
    QUARTERLY("분기"),
    SEMI_ANNUAL("반기");

    private final String description;
}