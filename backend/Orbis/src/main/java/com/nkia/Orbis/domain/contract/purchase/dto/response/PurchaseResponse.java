package com.nkia.Orbis.domain.contract.purchase.dto.response;

import com.nkia.Orbis.domain.contract.purchase.entity.Purchase;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PurchaseResponse {

    private Long id;

    private String content;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static PurchaseResponse from(Purchase purchase) {
        return PurchaseResponse.builder()
                .id(purchase.getId())
                .content(purchase.getContent())
                .quantity(purchase.getQuantity())
                .price(purchase.getPrice())
                .totalPrice(purchase.getTotalPrice())
                .build();
    }
}
