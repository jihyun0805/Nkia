package com.nkia.Orbis.domain.activity.quotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.quotation.entity.LaborType;
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
    private QuotationHistory quotation;

    @Enumerated(EnumType.STRING)
    private LaborType laborType;

    @Column(nullable = false)
    private Long unitPrice;

    private Double manMonth;

    private Long supplyPrice;

    public static QuotationLaborItemHistory create(
            LaborType laborType,
            Long unitPrice,
            Double manMonth,
            Long supplyPrice
    ) {
        QuotationLaborItemHistory item = new QuotationLaborItemHistory();

        item.laborType = laborType;

        // 인건비가 아닌 제경비와 기술료 일때는 노임단가와 Mab/Month Null 처리
        if (laborType == LaborType.EXPENSE || laborType == LaborType.TECH_FEE) {

            item.unitPrice = null;
            item.manMonth = null;
            item.supplyPrice = supplyPrice;

            // 인건비일 경우 공급금액 계산 로직 수행
        } else {

            item.unitPrice = unitPrice;
            item.manMonth = manMonth;
            item.supplyPrice = calculateSupplyPrice(unitPrice, manMonth);
        }

        return item;
    }

    public void setQuotation(QuotationHistory quotation) {
        this.quotation = quotation;
    }

    private static Long calculateSupplyPrice(Long unitPrice, Double manMonth) {

        if (manMonth != null) {
            return (long) (unitPrice * manMonth);
        }

        return 0L;
    }
}
