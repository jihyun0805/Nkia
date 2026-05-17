package com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity.MaintenanceQuotationHistory;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MaintenanceQuotationHistoryListResponse {

    private Long id;
    private Integer version;
    private String refNo;
    private LocalDate quotationDate;
    private Long totalAmount;

    public static MaintenanceQuotationHistoryListResponse from(MaintenanceQuotationHistory history) {
        return MaintenanceQuotationHistoryListResponse.builder()
                .id(history.getId())
                .version(history.getVersion())
                .refNo(history.getRefNo())
                .quotationDate(history.getQuotationDate())
                .totalAmount(history.getTotalAmount())
                .build();
    }
}
