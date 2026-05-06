package com.nkia.Orbis.domain.company.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CompanyCategory {
    SI("SI"),
    SOLUTION("솔루션"),
    ETC("기타");

    private final String description;
}
