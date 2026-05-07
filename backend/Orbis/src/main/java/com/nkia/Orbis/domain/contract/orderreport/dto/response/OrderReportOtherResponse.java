package com.nkia.Orbis.domain.contract.orderreport.dto.response;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportOther;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportOtherResponse {

    private Long id;

    private String content;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static OrderReportOtherResponse from(OrderReportOther other) {
        return OrderReportOtherResponse.builder()
                .id(other.getId())
                .content(other.getContent())
                .quantity(other.getQuantity())
                .price(other.getPrice())
                .totalPrice(other.getTotalPrice())
                .build();
    }
}
