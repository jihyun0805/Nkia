package com.nkia.Orbis.domain.activity.salesactivity.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ActivityType {
    EMAIL("이메일"),
    CALL("전화"),
    VIDEO_MEETING("화상 회의"),
    OFFLINE_MEETING("오프라인 미팅"),
    ETC("기타");

    private final String description;
}
