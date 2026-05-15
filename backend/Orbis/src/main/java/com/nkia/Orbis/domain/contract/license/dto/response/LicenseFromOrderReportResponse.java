package com.nkia.Orbis.domain.contract.license.dto.response;

import com.nkia.Orbis.domain.contract.license.entity.License;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LicenseFromOrderReportResponse {

    private Long id;

    private Long productModuleId;

    private String productClass;

    private String productGroup;

    private String productName;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static LicenseFromOrderReportResponse from(License license) {
        return LicenseFromOrderReportResponse.builder()
                .id(license.getId())
                .productModuleId(license.getProductModule().getId())
                .productClass(license.getProductClass().getDescription())
                .productGroup(license.getProductGroup())
                .productName(license.getProductName())
                .quantity(license.getQuantity())
                .price(license.getPrice())
                .totalPrice(license.getTotalPrice())
                .build();
    }
}
