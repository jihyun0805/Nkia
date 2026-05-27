package com.nkia.Orbis.domain.contract.orderreporthistory.dto.response;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportMaintenanceHistory;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportMaintenanceHistoryResponse {

    private Long id;

    private String content;

    private String visitCycle;

    private Integer month;

    private Long price;

    private Long totalPrice;

    public static OrderReportMaintenanceHistoryResponse from(OrderReportMaintenanceHistory maintenance) {
        return OrderReportMaintenanceHistoryResponse.builder()
                .id(maintenance.getId())
                .content(maintenance.getContent())
                .visitCycle(maintenance.getVisitCycle().getDescription())
                .month(maintenance.getMonth())
                .price(maintenance.getPrice())
                .totalPrice(maintenance.getTotalPrice())
                .build();
    }
}
