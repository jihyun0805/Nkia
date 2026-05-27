package com.nkia.Orbis.domain.activity.quotation.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LaborType {
    SPECIAL("인건비(특급)"),   // 특급
    HIGH("인건비(고급)"),      // 고급
    MIDDLE("인건비(중급)"),    // 중급
    LOW("인건비(초급)"),       // 초급
    EXPENSE("제경비"),   // 제경비
    TECH_FEE("기술료");   // 기술료

    private final String description;
}
