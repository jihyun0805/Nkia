package com.nkia.Orbis.domain.admin.permission.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PermissionAction {
    READ("조회"),
    CREATE("생성"),
    UPDATE("수정"),
    DELETE("삭제"),
    APPROVE("승인"),
    EXPORT("내보내기"),
    MANAGE("관리");

    private final String description;
}
