package com.nkia.Orbis.domain.activity.salesactivity.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ActivityPurpose {
    CONSULTING("컨설팅"),
    PRODUCT_INTRODUCTION("제품 소개"),
    DEMO("데모"),
    POC("PoC"),
    BMT("BMT"),
    DOCUMENT_DELIVERY("자료"),
    RFP_ANALYSIS("RFP 분석"),
    PROPOSAL_WRITING("제안서 작성"),
    SI_PROPOSAL_WRITING("SI 제안서 작성"),
    ETC("기타");

    private final String description;
}
