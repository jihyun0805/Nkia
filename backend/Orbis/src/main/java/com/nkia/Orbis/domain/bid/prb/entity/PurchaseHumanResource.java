package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PurchaseHumanResource {

    // 1. 등급 (기존 Enum 재사용)
    @Enumerated(EnumType.STRING)
    @Column(name = "grade", length = 20)
    private EngineerGrade grade;

    // 2. 투입량 (M/M)
    @Column(name = "input_man_month", precision = 5, scale = 2)
    private BigDecimal inputManMonth;

    // 3. 투입 기간
    @Column(name = "human_resource_start_date")
    private LocalDate startDate;

    @Column(name = "human_resource_end_date")
    private LocalDate endDate;

    // 4. 기준 금액 및 최종 금액
    @Column(name = "human_resource_base_amount", precision = 15, scale = 2)
    private BigDecimal baseAmount;

    @Column(name = "human_resource_total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount; // 파생 변수 (투입량 * 기준 금액)

    public PurchaseHumanResource(EngineerGrade grade, BigDecimal inputManMonth, LocalDate startDate,
                                 LocalDate endDate, BigDecimal baseAmount) {
        this.grade = grade;
        this.inputManMonth = inputManMonth;
        this.startDate = startDate;
        this.endDate = endDate;
        this.baseAmount = baseAmount;

        // 생성 시 금액 자동 계산
        this.totalAmount = calculateTotalAmount();
    }

    private BigDecimal calculateTotalAmount() {
        if (this.baseAmount == null || this.inputManMonth == null) {
            return BigDecimal.ZERO;
        }
        return this.baseAmount.multiply(this.inputManMonth).setScale(2, RoundingMode.HALF_UP);
    }

    public PurchaseHumanResource copy() {
        return new PurchaseHumanResource(
                this.grade,
                this.inputManMonth,
                this.startDate,
                this.endDate,
                this.baseAmount
        );
    }
}
