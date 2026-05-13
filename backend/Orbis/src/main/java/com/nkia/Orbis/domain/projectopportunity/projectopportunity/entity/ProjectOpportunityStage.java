package com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProjectOpportunityStage {
    FINDING("발굴"),
    ACTIVITY("활동"),
    BID("입찰"),
    CONTRACT("계약"),
    PROJECT("사업"),
    MAINTENANCE("유지보수"),
    POST_SALES("사후영업");

    private final String description;
}