package com.nkia.Orbis.domain.contract.license.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LicenseType {
    OFFICIAL("정식"),
    TEMPORARY("임시"),
    TRIAL("체험");

    private final String description;
}
