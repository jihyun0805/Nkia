package com.nkia.Orbis.domain.admin.productmodule.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProductClass {

    EMS("EMS"),
    DASHBOARD("Dashboard"),
    DATACENTER("상면 관리"),
    RCA("RCA"),
    DCA("DCA"),
    ITSM("ITSM"),
    ITAM("ITAM"),
    SUPPORTING_TOOLS("Supporting Tools"),
    CLOUD("CLOUD"),
    BSM("BSM"),
    E2E("E2E"),
    ETC("ETC");

    private final String description;
}
