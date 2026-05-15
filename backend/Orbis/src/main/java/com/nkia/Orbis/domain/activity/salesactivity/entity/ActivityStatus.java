package com.nkia.Orbis.domain.activity.salesactivity.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ActivityStatus {
    REQUESTED("요청"),
    PLANNED("예정"),
    IN_PROGRESS("진행중"),
    COMPLETED("완료"),
    CANCELED("취소");

    private final String description;
}
