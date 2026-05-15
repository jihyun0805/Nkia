package com.nkia.Orbis.domain.contract.license.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.contract.license.entity.License;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LicenseResponse {

    private Long id;

    private Long workflowId;

    private ApprovalStatus status;

    private Long orderReportId;

    private Long productModuleId;

    private ProductClass productClass;

    private String productGroup;

    private String productName;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    private String licenseType;

    private String licenseStatus;

    private Long customerCompanyId;

    private String customerCompanyName;

    private LocalDate startDate;

    private LocalDate endDate;

    public static LicenseResponse from(License license, Long workflowId) {
        return LicenseResponse.builder()
                .id(license.getId())
                .workflowId(workflowId)
                .status(license.getStatus())
                .orderReportId(license.getOrderReport() != null ? license.getOrderReport().getId() : null)
                .productModuleId(license.getProductModule().getId())
                .productClass(license.getProductClass())
                .productGroup(license.getProductGroup())
                .productName(license.getProductName())
                .quantity(license.getQuantity())
                .price(license.getPrice())
                .totalPrice(license.getTotalPrice())
                .licenseType(license.getLicenseType().getDescription())
                .licenseStatus(license.getLicenseStatus().getDescription())
                .customerCompanyId(license.getCustomerCompany().getId())
                .customerCompanyName(license.getCustomerCompany().getName())
                .startDate(license.getStartDate())
                .endDate(license.getEndDate())
                .build();
    }
}
