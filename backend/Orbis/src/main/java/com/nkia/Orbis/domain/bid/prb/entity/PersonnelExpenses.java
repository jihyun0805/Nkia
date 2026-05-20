package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.JoinColumn;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PersonnelExpenses {

    // 1. 상주 비용 리스트 (별도 테이블 생성)
    @ElementCollection
    @CollectionTable(name = "prb_resident_expense", joinColumns = @JoinColumn(name = "prb_id"))
    private List<PersonnelExpense> residentExpenses = new ArrayList<>();

    // 2. 비상주 비용 리스트 (별도 테이블 생성)
    @ElementCollection
    @CollectionTable(name = "prb_non_resident_expense", joinColumns = @JoinColumn(name = "prb_id"))
    private List<PersonnelExpense> nonResidentExpenses = new ArrayList<>();

    // 3. 상주 비용 합계
    @Column(name = "resident_total_man_month", precision = 7, scale = 2)
    private BigDecimal residentTotalManMonth = BigDecimal.ZERO;

    @Column(name = "resident_total_amount", precision = 15, scale = 2)
    private BigDecimal residentTotalAmount = BigDecimal.ZERO;

    // 4. 비상주 비용 합계
    @Column(name = "non_resident_total_man_month", precision = 7, scale = 2)
    private BigDecimal nonResidentTotalManMonth = BigDecimal.ZERO;

    @Column(name = "non_resident_total_amount", precision = 15, scale = 2)
    private BigDecimal nonResidentTotalAmount = BigDecimal.ZERO;

    // 5. 총 투입량 및 총 금액
    @Column(name = "total_man_month", precision = 7, scale = 2)
    private BigDecimal totalManMonth = BigDecimal.ZERO;

    @Column(name = "personnel_expense_total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    /**
     * 인건비 리스트 갱신 및 모든 합계 자동 계산
     */
    public void updateExpenses(List<PersonnelExpense> newResidentExpenses,
                               List<PersonnelExpense> newNonResidentExpenses) {
        // 기존 컬렉션을 clear() 하고 addAll() 해야 JPA가 고아 객체를 올바르게 삭제/업데이트 합니다.
        this.residentExpenses.clear();
        if (newResidentExpenses != null) {
            this.residentExpenses.addAll(newResidentExpenses);
        }

        this.nonResidentExpenses.clear();
        if (newNonResidentExpenses != null) {
            this.nonResidentExpenses.addAll(newNonResidentExpenses);
        }

        calculateAggregations();
    }

    /**
     * 상주/비상주 비용의 M/M 및 금액 합계 계산
     */
    private void calculateAggregations() {
        // 상주 합계 계산
        this.residentTotalManMonth = sumManMonth(this.residentExpenses);
        this.residentTotalAmount = sumAmount(this.residentExpenses);

        // 비상주 합계 계산
        this.nonResidentTotalManMonth = sumManMonth(this.nonResidentExpenses);
        this.nonResidentTotalAmount = sumAmount(this.nonResidentExpenses);

        // 전체 총계 계산
        this.totalManMonth = this.residentTotalManMonth.add(this.nonResidentTotalManMonth);
        this.totalAmount = this.residentTotalAmount.add(this.nonResidentTotalAmount);
    }

    private BigDecimal sumManMonth(List<PersonnelExpense> expenses) {
        return expenses.stream()
                .map(PersonnelExpense::getInputManMonth)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumAmount(List<PersonnelExpense> expenses) {
        return expenses.stream()
                .map(PersonnelExpense::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public PersonnelExpenses copy() {
        PersonnelExpenses copy = new PersonnelExpenses();

        // 리스트가 null이 아니면 stream을 통해 내부 요소도 전부 copy() 호출
        copy.residentExpenses = this.residentExpenses != null ?
                this.residentExpenses.stream().map(PersonnelExpense::copy).toList() : new ArrayList<>();

        copy.nonResidentExpenses = this.nonResidentExpenses != null ?
                this.nonResidentExpenses.stream().map(PersonnelExpense::copy).toList() : new ArrayList<>();

        // 나머지 단순 집계 필드 복사
        copy.residentTotalManMonth = this.residentTotalManMonth;
        copy.residentTotalAmount = this.residentTotalAmount;
        copy.nonResidentTotalManMonth = this.nonResidentTotalManMonth;
        copy.nonResidentTotalAmount = this.nonResidentTotalAmount;
        copy.totalManMonth = this.totalManMonth;
        copy.totalAmount = this.totalAmount;

        return copy;
    }

    public static PersonnelExpenses createEmpty() {
        return new PersonnelExpenses();
    }
}
