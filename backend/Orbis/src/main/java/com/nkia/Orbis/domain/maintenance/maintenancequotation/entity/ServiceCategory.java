package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ServiceCategory {
    BASIC("기본 서비스"),
    ADDITIONAL("추가 서비스"),
    EDUCATIONAL("교육 서비스");

    private final String description;

    public static ServiceCategory fromDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            return null;
        }

        for (ServiceCategory category : values()) {
            if (category.getDescription().equals(description.trim())) {
                return category;
            }
        }

        throw new ApiException(MaintenanceErrorCode.CATEGORY_NOT_FOUND);
    }
}

