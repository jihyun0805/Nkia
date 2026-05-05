package com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response;

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
}
