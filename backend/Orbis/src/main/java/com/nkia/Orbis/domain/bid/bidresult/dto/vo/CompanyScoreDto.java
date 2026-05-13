package com.nkia.Orbis.domain.bid.bidresult.dto.vo;

import com.nkia.Orbis.domain.bid.bidresult.entity.CompanyScore;
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

    public CompanyScore toValueObject() {
        // 엔티티의 정적 팩토리 메서드(of)를 활용하여 정합성을 유지합니다.
        return CompanyScore.of(this.companyName, this.technicalScore, this.priceScore);
    }
}