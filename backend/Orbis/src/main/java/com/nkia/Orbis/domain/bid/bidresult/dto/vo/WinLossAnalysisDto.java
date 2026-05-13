package com.nkia.Orbis.domain.bid.bidresult.dto.vo;

import com.nkia.Orbis.domain.bid.bidresult.entity.AnalysisCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class WinLossAnalysisDto {

    @NotNull(message = "분석 카테고리는 필수입니다.")
    private AnalysisCategory category;

    @NotBlank(message = "평가 항목(질문)은 필수입니다.")
    private String evaluationItem;

    @Min(value = 1, message = "점수는 최소 1점이어야 합니다.")
    @Max(value = 5, message = "점수는 최대 5점이어야 합니다.")
    @NotNull(message = "점수는 필수입니다.")
    private Integer score;

    private String reason; // 평가 이유
}