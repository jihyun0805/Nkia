package com.nkia.Orbis.domain.activity.quotation.dto.request;

import com.nkia.Orbis.domain.activity.quotation.entity.LaborType;
import lombok.Getter;

@Getter
public class LaborItemCreateRequest {

    private LaborType laborType;

    private Long unitPrice;

    private Double manMonth;

    private Long supplyPrice;
}
