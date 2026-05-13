package com.nkia.Orbis.domain.bid.bidresult.dto.vo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CompanyScoreDto {

    @NotBlank(message = "업체명은 필수입니다.")
    private String companyName;

    @PositiveOrZero(message = "기술 평점은 0점 이상이어야 합니다.")
    private double technicalScore;

    @PositiveOrZero(message = "가격 평점은 0점 이상이어야 합니다.")
    private double priceScore;
}