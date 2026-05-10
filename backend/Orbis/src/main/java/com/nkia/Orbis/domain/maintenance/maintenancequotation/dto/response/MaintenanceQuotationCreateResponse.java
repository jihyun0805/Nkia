package com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class MaintenanceQuotationCreateResponse {
    private Long id;
    private String refNo;
    private LocalDate quotationDate;
    private Long totalQuotationAmount;

    public static MaintenanceQuotationCreateResponse from(MaintenanceQuotation entity) {
        return MaintenanceQuotationCreateResponse.builder()
                .id(entity.getId())
                .refNo(entity.getRefNo())
                .quotationDate(entity.getQuotationDate())
                .totalQuotationAmount(entity.getTotalQuotationAmount())
                .build();
    }
}
