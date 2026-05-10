package com.nkia.Orbis.domain.contract.orderreporthistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.contract.license.entity.License;
import com.nkia.Orbis.domain.contract.license.entity.LicenseStatus;
import com.nkia.Orbis.domain.contract.license.entity.LicenseType;
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
public class LicenseHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_history_id")
    private OrderReportHistory orderReportHistory;

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

    public static LicenseHistory create(
            License license
    ) {
        LicenseHistory licenseHistory = new LicenseHistory();

        licenseHistory.productModule = license.getProductModule();
        licenseHistory.productClass = license.getProductClass();
        licenseHistory.productGroup = license.getProductGroup();
        licenseHistory.productName = license.getProductName();
        licenseHistory.quantity = license.getQuantity();
        licenseHistory.price = license.getPrice();
        licenseHistory.totalPrice = license.getTotalPrice();
        licenseHistory.licenseType = license.getLicenseType();
        licenseHistory.licenseStatus = license.getLicenseStatus();
        licenseHistory.customerCompany = license.getCustomerCompany();
        licenseHistory.startDate = license.getStartDate();
        licenseHistory.endDate = license.getEndDate();

        return licenseHistory;
    }

    public void setOrderReportHistory(OrderReportHistory orderReportHistory) {
        this.orderReportHistory = orderReportHistory;
    }
}
