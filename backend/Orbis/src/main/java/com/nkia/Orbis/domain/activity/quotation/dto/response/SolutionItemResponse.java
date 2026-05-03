package com.nkia.Orbis.domain.activity.quotation.dto.response;

import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItem;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SolutionItemResponse {
    private Long id;

    private Long productModuleId;

    private Integer quantity;

    private Long consumerPrice;

    private Long consumerTotalPrice;

    private Long supplyPrice;

    private Long supplyTotalPrice;

    private Double discountRate;

    private Boolean freeSupply;

    public static SolutionItemResponse from(QuotationSolutionItem item) { // 수정됨
        return SolutionItemResponse.builder()
                .id(item.getId())
                .productModuleId(
                        item.getProductModule() == null
                                ? null
                                : item.getProductModule().getId()
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
