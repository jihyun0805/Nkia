package com.nkia.Orbis.domain.bid.proposal.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProposalStatus {

    IN_PROGRESS("작성중"),
    COMPLETED("완료");

    private final String description;
}