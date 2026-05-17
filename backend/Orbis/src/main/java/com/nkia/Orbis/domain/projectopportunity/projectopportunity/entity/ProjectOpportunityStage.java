package com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProjectOpportunityStage {
    FINDING("발굴"),
    PROMISING("유망"),
    PROGRESSING("진행중");

    private final String description;
}