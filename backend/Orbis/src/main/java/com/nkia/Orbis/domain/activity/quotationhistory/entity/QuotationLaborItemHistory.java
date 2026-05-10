package com.nkia.Orbis.domain.activity.quotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.quotation.entity.LaborType;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationLaborItem;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuotationLaborItemHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_history_id")
    private QuotationHistory quotationHistory;

    @Enumerated(EnumType.STRING)
    private LaborType laborType;

    @Column(nullable = false)
    private Long unitPrice;

    private Double manMonth;

    private Long supplyPrice;

    public static QuotationLaborItemHistory create(
            QuotationLaborItem item
    ) {
        QuotationLaborItemHistory historyItem = new QuotationLaborItemHistory();

        historyItem.laborType = item.getLaborType();
        historyItem.unitPrice = item.getUnitPrice();
        historyItem.manMonth = item.getManMonth();
        historyItem.supplyPrice = item.getSupplyPrice();

        return historyItem;
    }

    public void setQuotation(QuotationHistory quotation) {
        this.quotationHistory = quotation;
    }
}
