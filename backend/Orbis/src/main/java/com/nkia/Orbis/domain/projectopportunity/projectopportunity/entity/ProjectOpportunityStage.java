package com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProjectOpportunityStage {
    // 사업기회 영업 진행도 (S14P31S106-336, 2026-05-17)
    FINDING("발굴"),
    PROMISING("유망"),
    PROGRESSING("진행중"),
    // 사업 lifecycle 단계 (기존 데이터/autoseed/AI 챗봇 호환).
    // 최준 님 확인 후 추가 (협의 결과: 10종 유지).
    ACTIVITY("활동"),
    BID("입찰"),
    CONTRACT("계약"),
    PROJECT("사업"),
    MAINTENANCE("유지보수"),
    POST_SALES("사후영업");

    private final String description;
}