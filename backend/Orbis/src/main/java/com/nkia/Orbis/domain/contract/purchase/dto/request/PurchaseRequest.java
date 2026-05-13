package com.nkia.Orbis.domain.contract.purchase.dto.request;

import lombok.Getter;

@Getter
public class PurchaseRequest {

    private String content;

    private Integer quantity;

    private Long price;
}
