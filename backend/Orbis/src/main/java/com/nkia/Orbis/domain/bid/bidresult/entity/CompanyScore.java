package com.nkia.Orbis.domain.bid.bidresult.entity;

import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompanyScore {

    private String companyName;
    private double technicalScore;
    private double priceScore;
    private double sumScore;

    // private 생성자로 내부에서만 생성 가능하도록 통제
    private CompanyScore(String companyName, double technicalScore, double priceScore) {
        this.companyName = companyName;
        this.technicalScore = technicalScore;
        this.priceScore = priceScore;
        this.sumScore = technicalScore + priceScore;
    }

    /**
     * 오직 이 정적 팩토리 메서드를 통해서만 객체를 생성할 수 있습니다.
     */
    public static CompanyScore of(String companyName, double technicalScore, double priceScore) {
        return new CompanyScore(companyName, technicalScore, priceScore);
    }
}