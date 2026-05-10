package com.nkia.Orbis.domain.contract.orderreporthistory.dto.response;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportPurchaseHistory;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportPurchaseHistoryResponse {

    private Long id;

    private String content;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static OrderReportPurchaseHistoryResponse from(OrderReportPurchaseHistory purchase) {
        return OrderReportPurchaseHistoryResponse.builder()
                .id(purchase.getId())
                .content(purchase.getContent())
                .quantity(purchase.getQuantity())
                .price(purchase.getPrice())
                .totalPrice(purchase.getTotalPrice())
                .build();
    }
}
