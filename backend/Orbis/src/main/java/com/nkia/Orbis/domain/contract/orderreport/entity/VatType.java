package com.nkia.Orbis.domain.contract.orderreport.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum VatType {
    INCLUDED("VAT 포함"),
    EXCLUDED("VAT 별도");

    private final String description;
}
