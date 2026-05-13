package com.nkia.Orbis.domain.contract.purchase.dto.response;

import com.nkia.Orbis.domain.contract.purchase.entity.Purchase;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PurchaseFromOrderReportResponse {

    private Long id;

    private String content;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static PurchaseFromOrderReportResponse from(Purchase purchase) {
        return PurchaseFromOrderReportResponse.builder()
                .id(purchase.getId())
                .content(purchase.getContent())
                .quantity(purchase.getQuantity())
                .price(purchase.getPrice())
                .totalPrice(purchase.getTotalPrice())
                .build();
    }
}
