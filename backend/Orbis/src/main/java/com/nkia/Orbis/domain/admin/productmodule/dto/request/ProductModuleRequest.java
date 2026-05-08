package com.nkia.Orbis.domain.admin.productmodule.dto.request;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import lombok.Getter;

@Getter
public class ProductModuleRequest {

    private ProductClass productClass;

    private String productGroup;

    private String productName;

    private String licenseStandard;

    private String licenseUnit;

    private Long unitPrice;

}
