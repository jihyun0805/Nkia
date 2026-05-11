package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PurchaseProduct {

    @Column(name = "vendor_name")
    private String vendorName;

    @Column(name = "purchase_product_name")
    private String productName;

    @Column(name = "purchase_product_quantity")
    private Integer quantity;

    @Column(name = "purchase_product_total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    public PurchaseProduct(String vendorName, String productName, Integer quantity,
                           BigDecimal totalAmount) {
        this.vendorName = vendorName;
        this.productName = productName;
        this.quantity = quantity;
        this.totalAmount = totalAmount;
    }
}
