package com.nkia.Orbis.domain.company.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Sector {
    PUBLIC("공공"),
    PRIVATE("민간"),
    OVERSEAS("해외");

    private final String description;
}
