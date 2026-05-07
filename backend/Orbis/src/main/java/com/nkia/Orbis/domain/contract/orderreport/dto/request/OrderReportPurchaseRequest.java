package com.nkia.Orbis.domain.contract.orderreport.dto.request;

import lombok.Getter;

@Getter
public class OrderReportPurchaseRequest {

    private String content;

    private Integer quantity;

    private Long price;
}
