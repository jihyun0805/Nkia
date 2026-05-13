package com.nkia.Orbis.domain.bid.bidresult.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AnalysisCategory {
    CUSTOMER("고객"),
    COMPETITOR("경쟁사"),
    PRODUCT_AND_TECH("제품 및 기술"),
    PROPOSAL_MATERIAL("제안서 및 제안 발표 자료"),
    PRESENTATION("제안 발표"),
    SALES("영업");

    private final String description;
}
