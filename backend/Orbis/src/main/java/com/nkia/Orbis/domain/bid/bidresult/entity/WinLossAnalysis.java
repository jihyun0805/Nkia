package com.nkia.Orbis.domain.bid.bidresult.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 스펙상 기본 생성자 필요
@AllArgsConstructor(access = AccessLevel.PRIVATE) // Builder를 위한 전체 생성자는 Private
@Builder
public class WinLossAnalysis {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisCategory category;

    @Column(nullable = false, length = 500)
    private String evaluationItem;

    @Min(value = 1, message = "점수는 최소 1점이어야 합니다.")
    @Max(value = 5, message = "점수는 최대 5점이어야 합니다.")
    @Column(nullable = false)
    private Integer score; // 1~5점

    @Column(length = 1000)
    private String reason; // 평가 이유
}