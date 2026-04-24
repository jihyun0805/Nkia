package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.JoinColumn;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor
public class PersonnelExpenses {

    @ElementCollection
    @CollectionTable(name = "prb_personnel_expense", joinColumns = @JoinColumn(name = "prb_id"))
    private List<PersonnelExpense> items = new ArrayList<>();
}