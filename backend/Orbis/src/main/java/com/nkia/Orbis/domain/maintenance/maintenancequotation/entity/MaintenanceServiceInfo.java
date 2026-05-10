package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class MaintenanceServiceInfo extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id")
    private MaintenanceQuotation quotation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_module_id")
    private ProductModule productModule; // 제품 모듈

    @Enumerated(EnumType.STRING)
    private ServiceCategory category;   // 구분 (enum)

    @Enumerated(EnumType.STRING)
    private ServiceItem item;           // 서비스 항목 (enum)

    private String content;             // 서비스 내용

    @Builder
    public MaintenanceServiceInfo(ProductModule productModule, ServiceCategory category, ServiceItem item,
                                  String content) {
        this.productModule = productModule;
        this.category = category;
        this.item = item;
        this.content = content;
    }

    void setQuotation(MaintenanceQuotation quotation) {
        this.quotation = quotation;
    }
    public void delete() {
        super.delete();
    }
}
