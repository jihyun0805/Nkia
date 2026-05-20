package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.JoinColumn;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Purchase {

    // 1. 매입 용역 / 제품 리스트
    @ElementCollection
    @CollectionTable(name = "prb_purchase_human_resource", joinColumns = @JoinColumn(name = "prb_id"))
    private List<PurchaseHumanResource> humanResources = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "prb_purchase_product", joinColumns = @JoinColumn(name = "prb_id"))
    private List<PurchaseProduct> products = new ArrayList<>();

    // 2. 용역 소계
    @Column(name = "service_subtotal_man_month", precision = 7, scale = 2)
    private BigDecimal serviceSubtotalManMonth = BigDecimal.ZERO;

    @Column(name = "service_subtotal_amount", precision = 15, scale = 2)
    private BigDecimal serviceSubtotalAmount = BigDecimal.ZERO;

    // 3. 제품 소계
    @Column(name = "product_subtotal_amount", precision = 15, scale = 2)
    private BigDecimal productSubtotalAmount = BigDecimal.ZERO;

    // 4. 총 합계 금액 (용역 + 제품)
    @Column(name = "total_purchase_amount", precision = 15, scale = 2)
    private BigDecimal totalPurchaseAmount = BigDecimal.ZERO;

    /**
     * 리스트 갱신 및 모든 소계/합계 자동 계산
     */
    public void updatePurchases(List<PurchaseHumanResource> newHumanResources,
                                List<PurchaseProduct> newProducts) {
        // JPA 고아 객체 관리를 위한 clear & addAll 패턴 적용
        this.humanResources.clear();
        if (newHumanResources != null) {
            this.humanResources.addAll(newHumanResources);
        }

        this.products.clear();
        if (newProducts != null) {
            this.products.addAll(newProducts);
        }

        calculateAggregations();
    }

    /**
     * 집계 메서드 (Stream API 활용)
     */
    private void calculateAggregations() {
        // 용역 소계 계산
        this.serviceSubtotalManMonth = this.humanResources.stream()
                .map(PurchaseHumanResource::getInputManMonth)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        this.serviceSubtotalAmount = this.humanResources.stream()
                .map(PurchaseHumanResource::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 제품 소계 계산
        this.productSubtotalAmount = this.products.stream()
                .map(PurchaseProduct::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 최종 합계 = 용역 소계 금액 + 제품 소계 금액
        this.totalPurchaseAmount = this.serviceSubtotalAmount.add(this.productSubtotalAmount);
    }

    public Purchase copy() {
        Purchase copy = new Purchase();

        // 1. 용역 리스트 깊은 복사
        copy.humanResources = this.humanResources != null ?
                this.humanResources.stream().map(PurchaseHumanResource::copy).toList() : new ArrayList<>();

        // 2. 제품 리스트 깊은 복사
        copy.products = this.products != null ?
                this.products.stream().map(PurchaseProduct::copy).toList() : new ArrayList<>();

        // 3. 계산된 소계 및 합계 필드 복사
        copy.serviceSubtotalManMonth = this.serviceSubtotalManMonth;
        copy.serviceSubtotalAmount = this.serviceSubtotalAmount;
        copy.productSubtotalAmount = this.productSubtotalAmount;
        copy.totalPurchaseAmount = this.totalPurchaseAmount;

        return copy;
    }
}
