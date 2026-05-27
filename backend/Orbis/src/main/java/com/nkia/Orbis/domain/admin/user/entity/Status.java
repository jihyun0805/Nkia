package com.nkia.Orbis.domain.admin.user.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Status {
    ACTIVE("재직"),
    LEAVE("휴직"),
    RESIGNED("퇴사");

    private final String description;
}
