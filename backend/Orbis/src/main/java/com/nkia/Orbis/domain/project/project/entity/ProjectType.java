package com.nkia.Orbis.domain.project.project.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ProjectType {
    SOLUTION("솔루션"),
    MAINTENANCE("유지보수"),
    SERVICE("용역");

    private final String description;
}
