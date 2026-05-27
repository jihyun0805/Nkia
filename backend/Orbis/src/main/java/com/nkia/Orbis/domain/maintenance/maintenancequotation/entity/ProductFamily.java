package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum ProductFamily {
    EMS("EMS"),
    ITSM("ITSM"),
    AUTOMATION("Automation"),
    WSS("WSS");

    private final String description;
}
