package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrbProfitLossInfo {
    // 1. 사업 금액 전체
    @Column(name = "total_project_amount", precision = 15, scale = 2)
    private BigDecimal totalProjectAmount;

    // 2. 당사 금액
    @Column(name = "our_company_amount", precision = 15, scale = 2)
    private BigDecimal ourCompanyAmount;

    // 3. 예상 수주율 (%)
    @Column(name = "expected_win_rate", precision = 5, scale = 2)
    private BigDecimal expectedWinRate;

    // 4. 추정 매출액 (당사 금액 * 예상 수주율)
    @Column(name = "estimated_revenue", precision = 15, scale = 2)
    private BigDecimal estimatedRevenue;

    // 5. 추정 영업 이익
    @Column(name = "estimated_operating_profit", precision = 15, scale = 2)
    private BigDecimal estimatedOperatingProfit;

    // 6. 추정 이익율 (%) (추정 영업 이익 / 추정 매출액 * 100)
    @Column(name = "estimated_profit_margin", precision = 5, scale = 2)
    private BigDecimal estimatedProfitMargin;

    /**
     * 손익 정보 갱신 및 파생 변수(추정 매출액, 이익율) 자동 계산
     */
    public void updateProfitLoss(BigDecimal totalProjectAmount, BigDecimal ourCompanyAmount,
                                 BigDecimal expectedWinRate, BigDecimal estimatedOperatingProfit) {
        this.totalProjectAmount = totalProjectAmount;
        this.ourCompanyAmount = ourCompanyAmount;
        this.expectedWinRate = expectedWinRate;
        this.estimatedOperatingProfit = estimatedOperatingProfit;

        // 내부적으로 파생 값들을 계산
        calculateEstimates();
    }

    /**
     * 계산 흐름을 제어하는 오케스트레이터 메서드
     */
    private void calculateEstimates() {
        this.estimatedRevenue = calculateEstimatedRevenue();
        this.estimatedProfitMargin = calculateEstimatedProfitMargin(this.estimatedRevenue);
    }

    /**
     * 1. 추정 매출액 계산
     */
    private BigDecimal calculateEstimatedRevenue() {
        // Guard Clause (보호 구문): 계산에 필요한 값이 없으면 즉시 0 반환 (else 블록 제거)
        if (this.ourCompanyAmount == null || this.expectedWinRate == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal ratePercentage =
                this.expectedWinRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return this.ourCompanyAmount.multiply(ratePercentage).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * 2. 추정 이익율 계산
     */
    private BigDecimal calculateEstimatedProfitMargin(BigDecimal calculatedRevenue) {
        // Guard Clause: 매출액이 0이거나 분자인 영업 이익이 없으면 즉시 0 반환 (Division by Zero 방지)
        if (calculatedRevenue == null || calculatedRevenue.compareTo(BigDecimal.ZERO) == 0
                || this.estimatedOperatingProfit == null) {
            return BigDecimal.ZERO;
        }

        return this.estimatedOperatingProfit.divide(calculatedRevenue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }

    @Builder
    public PrbProfitLossInfo(BigDecimal totalProjectAmount, BigDecimal ourCompanyAmount,
                             BigDecimal expectedWinRate, BigDecimal estimatedOperatingProfit) {
        // 생성 시점에도 update 메서드를 재사용하여
        // 데이터 할당과 파생 변수 계산이 무조건 이루어지도록 강제합니다.
        updateProfitLoss(totalProjectAmount, ourCompanyAmount, expectedWinRate,
                estimatedOperatingProfit);
    }

    public PrbProfitLossInfo copy() {
        return PrbProfitLossInfo.builder()
                .totalProjectAmount(this.totalProjectAmount)
                .ourCompanyAmount(this.ourCompanyAmount)
                .expectedWinRate(this.expectedWinRate)
                .estimatedOperatingProfit(this.estimatedOperatingProfit)
                .build();
    }
}
