package com.nkia.Orbis.domain.bid.prbresult.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ApprovalStatus {
    PENDING("미정"),
    REJECTED("반대"),
    APPROVED("찬성"),
    CONDITIONAL("조건부");

    private final String description;
}