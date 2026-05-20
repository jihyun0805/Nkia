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
public class GeneralOverheadExpenses {

    // 1. 제경비 리스트
    @ElementCollection
    @CollectionTable(name = "prb_general_overhead_expense",
            joinColumns = @JoinColumn(name = "prb_id"))
    private List<GeneralOverheadExpense> items = new ArrayList<>();

    // 2. 총 합계 금액
    @Column(name = "general_overhead_total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    /**
     * 제경비 리스트 갱신 및 합계 자동 계산
     */
    public void updateExpenses(List<GeneralOverheadExpense> newItems) {
        // JPA 고아 객체 관리를 위해 기존 리스트 비우기
        this.items.clear();
        if (newItems != null) {
            this.items.addAll(newItems);
        }

        // 갱신된 리스트를 바탕으로 총합 재계산
        calculateTotalAmount();
    }

    /**
     * Stream API를 활용한 안전한 총합 계산
     */
    private void calculateTotalAmount() {
        this.totalAmount = this.items.stream().map(GeneralOverheadExpense::getAmount) // 각 항목의 '금액'만 추출
                .filter(Objects::nonNull)               // Null 방지 (안전 연산)
                .reduce(BigDecimal.ZERO, BigDecimal::add); // 0부터 시작해서 모두 더하기
    }

    public GeneralOverheadExpenses copy() {
        GeneralOverheadExpenses copy = new GeneralOverheadExpenses();

        copy.items = this.items != null ?
                this.items.stream().map(GeneralOverheadExpense::copy).toList() : new ArrayList<>();

        copy.totalAmount = this.totalAmount;

        return copy;
    }
}
