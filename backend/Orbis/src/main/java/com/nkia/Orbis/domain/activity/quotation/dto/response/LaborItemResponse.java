package com.nkia.Orbis.domain.activity.quotation.dto.response;

import com.nkia.Orbis.domain.activity.quotation.entity.LaborType;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationLaborItem;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LaborItemResponse {

    private Long id;

    private LaborType laborType;

    private Long unitPrice;

    private Double manMonth;

    private Long supplyPrice;

    public static LaborItemResponse from(QuotationLaborItem item) { // 수정됨
        return LaborItemResponse.builder()
                .id(item.getId())
                .laborType(item.getLaborType())
                .unitPrice(item.getUnitPrice())
                .manMonth(item.getManMonth())
                .supplyPrice(item.getSupplyPrice())
                .build();
    }
}
