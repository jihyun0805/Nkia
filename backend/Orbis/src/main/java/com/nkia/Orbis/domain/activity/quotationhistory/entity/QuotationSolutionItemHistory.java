package com.nkia.Orbis.domain.activity.quotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItem;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
public class QuotationSolutionItemHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_history_id")
    private QuotationHistory quotationHistory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_module_id")
    private ProductModule productModule;

    @Column(nullable = false)
    private Integer quantity;

    private Long consumerPrice;

    private Long consumerTotalPrice;

    @Column(nullable = false)
    private Long supplyPrice;

    private Long supplyTotalPrice;

    @Column(nullable = false)
    private Double discountRate;

    private Boolean freeSupply;

    public static QuotationSolutionItemHistory create(
            QuotationSolutionItem item
    ) {
        QuotationSolutionItemHistory historyItem = new QuotationSolutionItemHistory();
        historyItem.productModule = item.getProductModule();
        historyItem.quantity = item.getQuantity();
        historyItem.consumerPrice = item.getConsumerPrice();
        historyItem.consumerTotalPrice = item.getConsumerTotalPrice();
        historyItem.supplyPrice = item.getSupplyPrice();
        historyItem.discountRate = item.getDiscountRate();
        historyItem.freeSupply = item.getFreeSupply();
        historyItem.supplyTotalPrice = item.getSupplyTotalPrice();
        return historyItem;
    }

    public void setQuotation(QuotationHistory quotation) {
        this.quotationHistory = quotation;
    }

}
