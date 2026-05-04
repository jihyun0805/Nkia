package com.nkia.Orbis.domain.maintenance.maintenance.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Importance {
    HIGH("상"),
    MEDIUM("중"),
    LOW("하");

    private final String description;

    public static Importance fromDescription(String description) {
        for (Importance importance : Importance.values()) {
            if (importance.getDescription().equals(description)) {
                return importance;
            }
        }
        throw new IllegalArgumentException("올바르지 않은 중요도 값입니다: " + description);
    }
}
