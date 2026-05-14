package com.nkia.Orbis.domain.bid.bidresult.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum BidOutcome {
    WIN("수주"),
    LOSS("실주");

    private final String description;
}