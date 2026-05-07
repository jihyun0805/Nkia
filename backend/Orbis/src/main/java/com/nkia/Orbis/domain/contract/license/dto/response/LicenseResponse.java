package com.nkia.Orbis.domain.contract.license.dto.response;

import com.nkia.Orbis.domain.contract.license.entity.License;
import com.nkia.Orbis.domain.contract.license.entity.LicenseStatus;
import com.nkia.Orbis.domain.contract.license.entity.LicenseType;
import com.nkia.Orbis.domain.productmodule.entity.ProductClass;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LicenseResponse {

    private Long id;

    private Long orderReportId;

    private Long productModuleId;

    private ProductClass productClass;

    private String productGroup;

    private String productName;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    private LicenseType licenseType;

    private LicenseStatus licenseStatus;

    private Long customerCompanyId;

    private String customerCompanyName;

    private LocalDate startDate;

    private LocalDate endDate;

    public static LicenseResponse from(License license) {
        return LicenseResponse.builder()
                .id(license.getId())
                .orderReportId(license.getOrderReport() != null ? license.getOrderReport().getId() : null)
                .productModuleId(license.getProductModule().getId())
                .productClass(license.getProductClass())
                .productGroup(license.getProductGroup())
                .productName(license.getProductName())
                .quantity(license.getQuantity())
                .price(license.getPrice())
                .totalPrice(license.getTotalPrice())
                .licenseType(license.getLicenseType())
                .licenseStatus(license.getLicenseStatus())
                .customerCompanyId(license.getCustomerCompany().getId())
                .customerCompanyName(license.getCustomerCompany().getName())
                .startDate(license.getStartDate())
                .endDate(license.getEndDate())
                .build();
    }
}
