package com.nkia.Orbis.domain.activity.quotation.dto.response;

import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItem;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SolutionItemResponse {
    private Long id;

    private Long productModuleId;

    private String productName;

    private String productGroup;

    private Integer quantity;

    private Long consumerPrice;

    private Long consumerTotalPrice;

    private Long supplyPrice;

    private Long supplyTotalPrice;

    private Double discountRate;

    private Boolean freeSupply;

    public static SolutionItemResponse from(QuotationSolutionItem item) {
        return SolutionItemResponse.builder()
                .id(item.getId())
                .productModuleId(
                        item.getProductModule() == null
                                ? null
                                : item.getProductModule().getId()
                )
                .productName(
                        item.getProductModule() == null
                                ? null
                                : item.getProductModule().getProductName()
                )
                .productGroup(
                        item.getProductModule() == null
                                ? null
                                : item.getProductModule().getProductGroup()
                )
                .quantity(item.getQuantity())
                .consumerPrice(item.getConsumerPrice())
                .consumerTotalPrice(item.getConsumerTotalPrice())
                .supplyPrice(item.getSupplyPrice())
                .supplyTotalPrice(item.getSupplyTotalPrice())
                .discountRate(item.getDiscountRate())
                .freeSupply(item.getFreeSupply())
                .build();
    }
}
