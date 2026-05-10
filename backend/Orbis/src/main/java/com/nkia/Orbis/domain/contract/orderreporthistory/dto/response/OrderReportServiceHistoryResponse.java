package com.nkia.Orbis.domain.contract.orderreporthistory.dto.response;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportServiceItemHistory;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportServiceHistoryResponse {

    private Long id;

    private String content;

    private Long manMonth;

    private Long price;

    private Long totalPrice;

    public static OrderReportServiceHistoryResponse from(OrderReportServiceItemHistory service) {
        return OrderReportServiceHistoryResponse.builder()
                .id(service.getId())
                .content(service.getContent())
                .manMonth(service.getManMonth())
                .price(service.getPrice())
                .totalPrice(service.getTotalPrice())
                .build();
    }
}
