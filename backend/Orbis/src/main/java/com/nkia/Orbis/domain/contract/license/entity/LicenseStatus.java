package com.nkia.Orbis.domain.contract.license.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LicenseStatus {
    ACTIVE("활성"),
    DEACTIVE("비활성"),
    ISSUED("발급 완료");

    private final String description;
}
