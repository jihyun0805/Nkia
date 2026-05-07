package com.nkia.Orbis.domain.contract.orderreport.dto.request;

import com.nkia.Orbis.domain.contract.orderreport.entity.VisitCycle;
import lombok.Getter;

@Getter
public class OrderReportMaintenanceRequest {

    private String content;

    private VisitCycle visitCycle;

    private Integer quantity;

    private Integer month;

    private Long price;
}
