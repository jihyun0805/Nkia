package com.nkia.Orbis.domain.contract.purchase.dto.request;

import lombok.Getter;

@Getter
public class PurchaseFromOrderReportRequest {

    private String content;

    private Integer quantity;

    private Long price;
}
