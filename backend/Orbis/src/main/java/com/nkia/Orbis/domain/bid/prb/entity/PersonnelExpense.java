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
public class PersonnelExpense {

    @Enumerated(EnumType.STRING)
    @Column(name = "grade", length = 20)
    private EngineerGrade grade;

    @Column(name = "input_man_month", precision = 5, scale = 2)
    private BigDecimal inputManMonth; // 투입량 (M/M)

    @Column(name = "personnel_expense_start_date")
    private LocalDate startDate; // 투입 시작 기간

    @Column(name = "personnel_expense_end_date")
    private LocalDate endDate; // 투입 종료 기간

    @Column(name = "personnel_expense_base_amount", precision = 15, scale = 2)
    private BigDecimal baseAmount; // 기준 금액

    @Column(name = "personnel_expense_total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount; // 금액 (파생 변수)

    /**
     * 개별 인건비 생성 시 금액(totalAmount) 자동 계산
     */
    public PersonnelExpense(EngineerGrade grade, BigDecimal inputManMonth, LocalDate startDate,
                            LocalDate endDate, BigDecimal baseAmount) {
        this.grade = grade;
        this.inputManMonth = inputManMonth;
        this.startDate = startDate;
        this.endDate = endDate;
        this.baseAmount = baseAmount;

        this.totalAmount = calculateTotalAmount();
    }

    private BigDecimal calculateTotalAmount() {
        if (this.baseAmount == null || this.inputManMonth == null) {
            return BigDecimal.ZERO;
        }
        return this.baseAmount.multiply(this.inputManMonth).setScale(2, RoundingMode.HALF_UP);
    }

    public PersonnelExpense copy() {
        return new PersonnelExpense(
                this.grade,
                this.inputManMonth,
                this.startDate,
                this.endDate,
                this.baseAmount
        );
    }
}
