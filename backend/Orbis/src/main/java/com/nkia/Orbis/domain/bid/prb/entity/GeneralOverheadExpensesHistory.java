package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.JoinColumn;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GeneralOverheadExpensesHistory {

    @ElementCollection
    @CollectionTable(name = "prb_history_general_overhead_expense", joinColumns = @JoinColumn(name = "prb_history_id"))
    private List<GeneralOverheadExpense> items = new ArrayList<>();

    @Column(name = "general_overhead_total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    public static GeneralOverheadExpensesHistory from(GeneralOverheadExpenses source) {
        if (source == null) {
            return null;
        }
        GeneralOverheadExpensesHistory hist = new GeneralOverheadExpensesHistory();
        hist.items = source.getItems() != null ? source.getItems().stream().map(GeneralOverheadExpense::copy).toList()
                : new ArrayList<>();
        hist.totalAmount = source.getTotalAmount();
        return hist;
    }
}