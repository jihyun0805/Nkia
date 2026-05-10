package com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class QuotationCreateResponse {
    private Long id;
    private String refNo;
    private LocalDate quotationDate;
    private Long totalQuotationAmount;

    public static QuotationCreateResponse from(MaintenanceQuotation entity) {
        return QuotationCreateResponse.builder()
                .id(entity.getId())
                .refNo(entity.getRefNo())
                .quotationDate(entity.getQuotationDate())
                .totalQuotationAmount(entity.getTotalQuotationAmount())
                .build();
    }
}
