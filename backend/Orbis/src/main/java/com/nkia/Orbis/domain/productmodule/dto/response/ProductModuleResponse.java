package com.nkia.Orbis.domain.productmodule.dto.response;

import com.nkia.Orbis.domain.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class ProductModuleResponse {
    private Long id;

    private ProductClass productClass;

    private String productGroup;

    private String productName;

    private String licenseStandard;

    private String licenseUnit;

    private Long unitPrice;

    public static ProductModuleResponse from(ProductModule productModule) {
        return ProductModuleResponse.builder()
                .id(productModule.getId())
                .productClass(productModule.getProductClass())
                .productGroup(productModule.getProductGroup())
                .productName(productModule.getProductName())
                .licenseStandard(productModule.getLicenseStandard())
                .licenseUnit(productModule.getLicenseUnit())
                .unitPrice(productModule.getUnitPrice())
                .build();
    }
}

