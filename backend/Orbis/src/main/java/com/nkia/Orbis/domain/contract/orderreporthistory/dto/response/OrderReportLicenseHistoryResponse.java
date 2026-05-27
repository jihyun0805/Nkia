package com.nkia.Orbis.domain.contract.orderreporthistory.dto.response;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.LicenseHistory;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportLicenseHistoryResponse {

    private Long id;

    private Long productModuleId;

    private String productClass;

    private String productGroup;

    private String productName;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static OrderReportLicenseHistoryResponse from(LicenseHistory license) {
        return OrderReportLicenseHistoryResponse.builder()
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
