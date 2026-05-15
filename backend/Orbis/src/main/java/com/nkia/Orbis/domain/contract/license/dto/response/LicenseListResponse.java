package com.nkia.Orbis.domain.contract.license.dto.response;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.contract.license.entity.License;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LicenseListResponse {

    private Long id;

    private Long orderReportId;

    private Long productModuleId;

    private ProductClass productClass;

    private String productName;

    private Integer quantity;

    private String licenseType;

    private String licenseStatus;

    private Long customerCompanyId;

    private String customerCompanyName;

    private LocalDate startDate;

    private LocalDate endDate;

    public static LicenseListResponse from(License license) {
        return LicenseListResponse.builder()
                .id(license.getId())
                .orderReportId(license.getOrderReport() != null ? license.getOrderReport().getId() : null)
                .productModuleId(license.getProductModule().getId())
                .productClass(license.getProductClass())
                .productName(license.getProductName())
                .quantity(license.getQuantity())
                .licenseType(license.getLicenseType().getDescription())
                .licenseStatus(license.getLicenseStatus().getDescription())
                .customerCompanyId(license.getCustomerCompany().getId())
                .customerCompanyName(license.getCustomerCompany().getName())
                .startDate(license.getStartDate())
                .endDate(license.getEndDate())
                .build();
    }
}
