package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum ProposalType {
    SELF("자체 제안"),
    SI("SI 제안");

    private final String description;

}
