package com.nkia.Orbis.domain.admin.productmodule.dto.response;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class ProductModuleResponse {
    private Long id;

    private String productClass;

    private String productGroup;

    private String productName;

    private String licenseStandard;

    private String licenseUnit;

    private Long unitPrice;

    public static ProductModuleResponse from(ProductModule productModule) {
        return ProductModuleResponse.builder()
                .id(productModule.getId())
                .productClass(productModule.getProductClass().getDescription())
                .productGroup(productModule.getProductGroup())
                .productName(productModule.getProductName())
                .licenseStandard(productModule.getLicenseStandard())
                .licenseUnit(productModule.getLicenseUnit())
                .unitPrice(productModule.getUnitPrice())
                .build();
    }
}

