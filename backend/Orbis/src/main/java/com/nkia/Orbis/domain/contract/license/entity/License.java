package com.nkia.Orbis.domain.contract.license.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
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
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class License extends BaseEntity {
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

    @Enumerated(EnumType.STRING)
    private LicenseType licenseType;

    @Enumerated(EnumType.STRING)
    private LicenseStatus licenseStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_company_id")
    private Company customerCompany;

    private LocalDate startDate;

    private LocalDate endDate;

    public static License createFromOrderReport(
            OrderReport orderReport,
            ProductModule productModule,
            Integer quantity
    ) {
        License license = new License();
        license.orderReport = orderReport;
        license.customerCompany = orderReport.getFinalCustomerCompany();
        license.startDate = orderReport.getContractStartDate();
        license.endDate = orderReport.getContractEndDate();

        license.applyProduct(productModule);
        license.applyPrice(quantity);
        license.licenseType = LicenseType.OFFICIAL;
        license.licenseStatus = LicenseStatus.ACTIVE;

        return license;
    }

    public static License createManual(
            Company customerCompany,
            ProductModule productModule,
            Integer quantity,
            LicenseType licenseType,
            LocalDate startDate,
            LocalDate endDate
    ) {
        License license = new License();
        license.customerCompany = customerCompany;
        license.startDate = startDate;
        license.endDate = endDate;

        license.applyProduct(productModule);
        license.applyPrice(quantity);
        license.licenseType = licenseType != null ? licenseType : LicenseType.OFFICIAL;
        license.licenseStatus = LicenseStatus.ACTIVE;

        return license;
    }

    private void applyProduct(ProductModule productModule) {
        this.productModule = productModule;
        this.productClass = productModule.getProductClass();
        this.productGroup = productModule.getProductGroup();
        this.productName = productModule.getProductName();
    }

    private void applyPrice(Integer quantity) {
        this.quantity = quantity;
        this.price = this.productModule.getUnitPrice();
        this.totalPrice = this.price * quantity;
    }

    public void setOrderReport(OrderReport orderReport) {
        this.orderReport = orderReport;
    }
}
