package com.nkia.Orbis.domain.contract.contractsummary.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProposalType {
    SELF("자체 제안"),
    SI("SI 제안");

    private final String description;
}
