package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class MaintenanceAmountReason extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id")
    private MaintenanceQuotation quotation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_module_id")
    private ProductModule productModule; // 제품 모듈

    private Integer quantity;           // 수량
    private Long amount;                // 유지보수 금액
    private Integer months;             // 개월수
    private String remarks;             // 비고

    @Builder
    public MaintenanceAmountReason(ProductModule productModule, Integer quantity, Long amount, Integer months,
                                   String remarks) {
        this.productModule = productModule;
        this.quantity = quantity;
        this.amount = amount;
        this.months = months;
        this.remarks = remarks;
    }

    void setQuotation(MaintenanceQuotation quotation) {
        this.quotation = quotation;
    }

}