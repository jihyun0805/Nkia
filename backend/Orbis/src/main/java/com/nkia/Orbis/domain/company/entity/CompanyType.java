package com.nkia.Orbis.domain.company.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum CompanyType {
    CUSTOMER("고객사"),
    PARTNER("협력사");

    private final String description;
}