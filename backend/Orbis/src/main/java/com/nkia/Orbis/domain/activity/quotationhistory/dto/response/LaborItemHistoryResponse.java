package com.nkia.Orbis.domain.activity.quotationhistory.dto.response;

import com.nkia.Orbis.domain.activity.quotationhistory.entity.QuotationLaborItemHistory;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LaborItemHistoryResponse {

    private Long id;

    private String laborType;

    private Long unitPrice;

    private Double manMonth;

    private Long supplyPrice;

    public static LaborItemHistoryResponse from(QuotationLaborItemHistory item) {
        return LaborItemHistoryResponse.builder()
                .id(item.getId())
                .laborType(item.getLaborType().getDescription())
                .unitPrice(item.getUnitPrice())
                .manMonth(item.getManMonth())
                .supplyPrice(item.getSupplyPrice())
                .build();
    }
}
