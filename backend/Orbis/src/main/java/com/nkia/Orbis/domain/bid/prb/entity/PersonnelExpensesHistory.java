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
public class PersonnelExpensesHistory {

    @ElementCollection
    @CollectionTable(name = "prb_history_resident_expense", joinColumns = @JoinColumn(name = "prb_history_id"))
    private List<PersonnelExpense> residentExpenses = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "prb_history_non_resident_expense", joinColumns = @JoinColumn(name = "prb_history_id"))
    private List<PersonnelExpense> nonResidentExpenses = new ArrayList<>();

    @Column(name = "resident_total_man_month", precision = 7, scale = 2)
    private BigDecimal residentTotalManMonth;
    @Column(name = "resident_total_amount", precision = 15, scale = 2)
    private BigDecimal residentTotalAmount;
    @Column(name = "non_resident_total_man_month", precision = 7, scale = 2)
    private BigDecimal nonResidentTotalManMonth;
    @Column(name = "non_resident_total_amount", precision = 15, scale = 2)
    private BigDecimal nonResidentTotalAmount;
    @Column(name = "personnel_total_man_month", precision = 7, scale = 2)
    private BigDecimal totalManMonth;
    @Column(name = "personnel_total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    public static PersonnelExpensesHistory from(PersonnelExpenses source) {
        if (source == null) {
            return null;
        }
        PersonnelExpensesHistory hist = new PersonnelExpensesHistory();
        hist.residentExpenses =
                source.getResidentExpenses() != null ? source.getResidentExpenses().stream().map(PersonnelExpense::copy)
                        .toList() : new ArrayList<>();
        hist.nonResidentExpenses = source.getNonResidentExpenses() != null ? source.getNonResidentExpenses().stream()
                .map(PersonnelExpense::copy).toList() : new ArrayList<>();
        hist.residentTotalManMonth = source.getResidentTotalManMonth();
        hist.residentTotalAmount = source.getResidentTotalAmount();
        hist.nonResidentTotalManMonth = source.getNonResidentTotalManMonth();
        hist.nonResidentTotalAmount = source.getNonResidentTotalAmount();
        hist.totalManMonth = source.getTotalManMonth();
        hist.totalAmount = source.getTotalAmount();
        return hist;
    }
}