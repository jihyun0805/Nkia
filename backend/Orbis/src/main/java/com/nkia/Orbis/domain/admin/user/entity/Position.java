package com.nkia.Orbis.domain.admin.user.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Position {
    TEAM_MEMBER(1, "팀원"),
    TEAM_LEADER(2, "팀장"),
    HEAD_DIRECTOR(3, "본부장");

    private final int level;

    public boolean isAtLeast(Position requiredPosition) {
        return this.level >= requiredPosition.level;
    }

    private final String description;
}
