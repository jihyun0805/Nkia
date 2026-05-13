package com.nkia.Orbis.domain.bid.bidresult.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DisclosureStatus {
    PUBLIC("공개"),
    PRIVATE("비공개");

    private final String description;
}