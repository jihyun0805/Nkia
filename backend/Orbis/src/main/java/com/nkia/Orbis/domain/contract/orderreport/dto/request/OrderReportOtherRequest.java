package com.nkia.Orbis.domain.contract.orderreport.dto.request;

import lombok.Getter;

@Getter
public class OrderReportOtherRequest {

    private String content;

    private Integer quantity;

    private Long price;
}
