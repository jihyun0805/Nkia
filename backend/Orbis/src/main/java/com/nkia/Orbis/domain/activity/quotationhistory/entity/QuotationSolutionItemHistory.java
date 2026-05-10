package com.nkia.Orbis.domain.activity.quotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
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
    private QuotationHistory quotation;

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
            ProductModule productModule,
            Integer quantity,
            Long supplyPrice,
            Double discountRate,
            Boolean freeSupply
    ) {
        QuotationSolutionItemHistory item = new QuotationSolutionItemHistory();
        item.productModule = productModule;
        item.quantity = quantity;
        item.consumerPrice = productModule.getUnitPrice();
        item.consumerTotalPrice = item.consumerPrice * quantity;
        item.supplyPrice = supplyPrice;
        item.discountRate = discountRate == null ? 0.0 : discountRate;
        item.freeSupply = Boolean.TRUE.equals(freeSupply);
        item.supplyTotalPrice = item.calculateSupplyTotalPrice();
        return item;
    }

    public void setQuotation(QuotationHistory quotation) {
        this.quotation = quotation;
    }

    //
    private Long calculateSupplyTotalPrice() {
        if (Boolean.TRUE.equals(this.freeSupply)) {
            return 0L;
        }

        return this.supplyPrice * this.quantity;
    }
}
