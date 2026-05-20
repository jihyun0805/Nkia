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
public class ProductCostHistory {

    @ElementCollection
    @CollectionTable(name = "prb_history_product_cost_item", joinColumns = @JoinColumn(name = "prb_history_id"))
    private List<ProductCostItem> items = new ArrayList<>();

    @Column(name = "total_list_price", precision = 15, scale = 2)
    private BigDecimal totalListPrice;
    @Column(name = "total_product_cost", precision = 15, scale = 2)
    private BigDecimal totalProductCost;

    public static ProductCostHistory from(ProductCost source) {
        if (source == null) {
            return null;
        }
        ProductCostHistory hist = new ProductCostHistory();
        hist.items = source.getItems() != null ? source.getItems().stream().map(ProductCostItem::copy).toList()
                : new ArrayList<>();
        hist.totalListPrice = source.getTotalListPrice();
        hist.totalProductCost = source.getTotalProductCost();
        return hist;
    }
}