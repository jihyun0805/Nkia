package com.nkia.Orbis.domain.contract.orderreport.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
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

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderReportLicense extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_id")
    private OrderReport orderReport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_module_id")
    private ProductModule productModule;

    @Enumerated(EnumType.STRING)
    private ProductClass productClass;

    private String productGroup;

    private String productName;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static OrderReportLicense create(
            ProductModule productModule,
            Integer quantity
    ) {
        OrderReportLicense license = new OrderReportLicense();
        license.productModule = productModule;
        license.productClass = productModule.getProductClass();
        license.productGroup = productModule.getProductGroup();
        license.productName = productModule.getProductName();
        license.quantity = quantity;
        license.price = productModule.getUnitPrice();
        license.totalPrice = license.price * quantity;

        return license;
    }

    void setOrderReport(OrderReport orderReport) {
        this.orderReport = orderReport;
    }
}
