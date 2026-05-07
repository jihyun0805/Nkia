package com.nkia.Orbis.domain.contract.license.dto.request;

import lombok.Getter;

@Getter
public class LicenseFromOrderReportRequest {

    private Long productModuleId;
    private Integer quantity;
}
