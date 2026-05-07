package com.nkia.Orbis.domain.contract.orderreport.dto.response;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportMaintenance;
import com.nkia.Orbis.domain.contract.orderreport.entity.VisitCycle;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportMaintenanceResponse {

    private Long id;

    private String content;

    private VisitCycle visitCycle;

    private Integer month;

    private Long price;

    private Long totalPrice;

    public static OrderReportMaintenanceResponse from(OrderReportMaintenance maintenance) {
        return OrderReportMaintenanceResponse.builder()
                .id(maintenance.getId())
                .content(maintenance.getContent())
                .visitCycle(maintenance.getVisitCycle())
                .month(maintenance.getMonth())
                .price(maintenance.getPrice())
                .totalPrice(maintenance.getTotalPrice())
                .build();
    }
}
