package com.nkia.Orbis.domain.contract.contractsummary.dto.response;

import com.nkia.Orbis.domain.contract.contractsummary.entity.ContractModuleItem;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ContractModuleItemResponse {

    private Long id;

    private Long productModuleId;

    private String productModuleName;

    private ProductClass productClass;

    private Integer quantity;

    private Long unitPrice;

    private Long totalPrice;

    public static ContractModuleItemResponse from(ContractModuleItem item) {
        return ContractModuleItemResponse.builder()
                .id(item.getId())
                .productModuleId(item.getProductModule().getId())
                .productModuleName(item.getProductModule().getProductName())
                .productClass(item.getProductClass())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .build();
    }
}
