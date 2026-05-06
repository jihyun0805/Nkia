package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ServiceItem {
    DAILY_SUPPORT("일상지원"),
    EMERGENCY_SUPPORT("긴급/장애 지원"),
    REGULAR_CHECKUP("정기점검"),
    PRODUCT_PATCH("제품 패치"),
    OZ_REPORT("OZ 보고서"),
    RECONSTRUCTION("재구축"),
    ENHANCEMENT("기능개선"),
    OTHER_SUPPORT("기타 지원 서비스"),
    TRAINING("사용자, 운영자 교육");

    private final String description;

    public static ServiceItem fromDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            return null;
        }

        for (ServiceItem item : values()) {
            if (item.getDescription().equals(description.trim())) {
                return item;
            }
        }

        throw new ApiException(MaintenanceErrorCode.ITEM_NOT_FOUND);
    }
}
