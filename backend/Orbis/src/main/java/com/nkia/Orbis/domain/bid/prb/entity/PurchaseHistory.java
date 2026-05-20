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
public class PurchaseHistory {

    @ElementCollection
    @CollectionTable(name = "prb_history_purchase_human_resource", joinColumns = @JoinColumn(name = "prb_history_id"))
    private List<PurchaseHumanResource> humanResources = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "prb_history_purchase_product", joinColumns = @JoinColumn(name = "prb_history_id"))
    private List<PurchaseProduct> products = new ArrayList<>();

    @Column(name = "service_subtotal_man_month", precision = 7, scale = 2)
    private BigDecimal serviceSubtotalManMonth;
    @Column(name = "service_subtotal_amount", precision = 15, scale = 2)
    private BigDecimal serviceSubtotalAmount;
    @Column(name = "product_subtotal_amount", precision = 15, scale = 2)
    private BigDecimal productSubtotalAmount;
    @Column(name = "total_purchase_amount", precision = 15, scale = 2)
    private BigDecimal totalPurchaseAmount;

    public static PurchaseHistory from(Purchase source) {
        if (source == null) {
            return null;
        }
        PurchaseHistory hist = new PurchaseHistory();
        hist.humanResources = source.getHumanResources() != null ? source.getHumanResources().stream()
                .map(PurchaseHumanResource::copy).toList() : new ArrayList<>();
        hist.products = source.getProducts() != null ? source.getProducts().stream().map(PurchaseProduct::copy).toList()
                : new ArrayList<>();
        hist.serviceSubtotalManMonth = source.getServiceSubtotalManMonth();
        hist.serviceSubtotalAmount = source.getServiceSubtotalAmount();
        hist.productSubtotalAmount = source.getProductSubtotalAmount();
        hist.totalPurchaseAmount = source.getTotalPurchaseAmount();
        return hist;
    }
}