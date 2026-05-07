package com.nkia.Orbis.domain.contract.orderreport.dto.response;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportService;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportServiceResponse {

    private Long id;

    private String content;

    private Long manMonth;

    private Long price;

    private Long totalPrice;

    public static OrderReportServiceResponse from(OrderReportService service) {
        return OrderReportServiceResponse.builder()
                .id(service.getId())
                .content(service.getContent())
                .manMonth(service.getManMonth())
                .price(service.getPrice())
                .totalPrice(service.getTotalPrice())
                .build();
    }
}
