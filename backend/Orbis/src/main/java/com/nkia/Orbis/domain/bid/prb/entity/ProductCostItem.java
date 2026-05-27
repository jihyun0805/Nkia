package com.nkia.Orbis.domain.bid.prb.entity;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProductCostItem {

    // 원가율 상수 (2% = 0.02)
    private static final BigDecimal COST_RATE = new BigDecimal("0.02");

    // 1. 엔티티 직접 참조(@ManyToOne) 대신 ID만 저장 (느슨한 결합)
    @Column(name = "product_module_id")
    private Long productModuleId;

    // 2. 작성 당시의 모듈 데이터 스냅샷 (이름이 바뀌어도 과거 PRB는 보존됨)
    @Enumerated(EnumType.STRING)
    @Column(name = "product_class", length = 50)
    private ProductClass productClass;

    @Column(name = "product_item_name")
    private String productName;

    // 3. 수량 및 금액
    @Column(name = "product_item_quantity")
    private Integer quantity;

    @Column(name = "product_item_list_price", precision = 15, scale = 2)
    private BigDecimal listPrice;

    @Column(name = "item_product_cost", precision = 15, scale = 2)
    private BigDecimal itemProductCost; // 제품 원가 (파생 변수)

    public ProductCostItem(Long productModuleId, ProductClass productClass, String productName,
                           Integer quantity, BigDecimal listPrice) {
        this.productModuleId = productModuleId;
        this.productClass = productClass;
        this.productName = productName;
        this.quantity = quantity;
        this.listPrice = listPrice;

        // 생성 시 원가 2% 자동 계산
        this.itemProductCost = calculateProductCost();
    }

    private BigDecimal calculateProductCost() {
        if (this.listPrice == null) {
            return BigDecimal.ZERO;
        }
        // 제품 원가 = list price * 2%
        return this.listPrice.multiply(COST_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    public ProductCostItem copy() {
        return new ProductCostItem(
                this.productModuleId,
                this.productClass,
                this.productName,
                this.quantity,
                this.listPrice
        );
    }
}
