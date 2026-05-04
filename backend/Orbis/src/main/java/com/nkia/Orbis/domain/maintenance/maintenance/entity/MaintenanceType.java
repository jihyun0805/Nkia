package com.nkia.Orbis.domain.maintenance.maintenance.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
public enum MaintenanceType {

    FREE("무상유지보수"),
    PAID("유상유지보수");

    private final String description;

    MaintenanceType(String description) {
        this.description = description;
    }
}