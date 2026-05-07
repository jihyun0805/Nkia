package com.nkia.Orbis.domain.contract.orderreport.dto.response;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportPurchase;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportPurchaseResponse {

    private Long id;

    private String content;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static OrderReportPurchaseResponse from(OrderReportPurchase purchase) {
        return OrderReportPurchaseResponse.builder()
                .id(purchase.getId())
                .content(purchase.getContent())
                .quantity(purchase.getQuantity())
                .price(purchase.getPrice())
                .totalPrice(purchase.getTotalPrice())
                .build();
    }
}
