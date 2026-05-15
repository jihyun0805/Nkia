package com.nkia.Orbis.common.constant;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ApprovalStatus {
    DRAFT("결재 대기"),
    PENDING("결재중"),
    APPROVED("승인 완료"),
    REJECTED("반려"),
    CANCELED("취소");

    private final String description;
}
