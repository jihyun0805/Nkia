package com.nkia.Orbis.domain.alarm.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum AlarmType {
    APPROVAL_REQUEST("결재 요청"),
    APPROVAL_REJECTED("결재 반려"),
    QUOTE_REVIEW("견적서 검토 요청"),
    DEADLINE_WARNING("마감 기한 알림"),
    MAINTENANCE_EXPIRY("유지보수 만료 알림");

    private final String description;
}