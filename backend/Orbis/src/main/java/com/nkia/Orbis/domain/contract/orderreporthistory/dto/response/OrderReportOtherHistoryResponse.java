package com.nkia.Orbis.domain.contract.orderreporthistory.dto.response;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportOtherHistory;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportOtherHistoryResponse {

    private Long id;

    private String content;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static OrderReportOtherHistoryResponse from(OrderReportOtherHistory other) {
        return OrderReportOtherHistoryResponse.builder()
                .id(other.getId())
                .content(other.getContent())
                .quantity(other.getQuantity())
                .price(other.getPrice())
                .totalPrice(other.getTotalPrice())
                .build();
    }
}
