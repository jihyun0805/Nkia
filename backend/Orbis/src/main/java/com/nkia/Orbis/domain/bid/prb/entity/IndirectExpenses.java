package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IndirectExpenses {

    // 1. 적용 대상 금액 합계 (인건비 + 제품 + 매입 + 제경비)
    @Column(name = "indirect_base_amount", precision = 15, scale = 2)
    private BigDecimal baseAmount;

    // 2. 간접비율 (%)
    @Column(name = "indirect_rate", precision = 5, scale = 2)
    private BigDecimal rate;

    // 3. 간접비 최종 금액
    @Column(name = "indirect_amount", precision = 15, scale = 2)
    private BigDecimal amount;

    /**
     * 간접비 계산 로직 캡슐화
     */
    public void calculateIndirectExpense(BigDecimal baseAmount, BigDecimal rate) {
        this.baseAmount = (baseAmount != null) ? baseAmount : BigDecimal.ZERO;
        this.rate = (rate != null) ? rate : BigDecimal.ZERO;

        // 간접비 = 적용 대상 금액 * (간접비율 / 100)
        BigDecimal rateMultiplier = this.rate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        this.amount = this.baseAmount.multiply(rateMultiplier).setScale(2, RoundingMode.HALF_UP);
    }

    public IndirectExpenses copy() {
        IndirectExpenses copy = new IndirectExpenses();
        copy.baseAmount = this.baseAmount;
        copy.rate = this.rate;
        copy.amount = this.amount;
        return copy;
    }
}
