package com.nkia.Orbis.domain.productmodule.dto.request;

import com.nkia.Orbis.domain.productmodule.entity.ProductClass;
import lombok.Getter;

@Getter
public class ProductModuleCreateRequest {

    private ProductClass productClass;

    private String productGroup;

    private String productName;

    private String licenseStandard;

    private String licenseUnit;

    private Long unitPrice;

}
