package com.nkia.Orbis.domain.project.billing.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum BillingStatus {
    REQUESTED("발행 요청"),
    APPROVED("결재 완료"),
    ISSUED("발행 완료"),
    COLLECTED("수금 완료");

    private final String description;
}