package com.nkia.Orbis.domain.contract.orderreport.dto.request;

import lombok.Getter;

@Getter
public class OrderReportMaintenanceOnlyItemRequest {

    private Integer year;

    private Long amount;

    private Long license;

    private Long thirdParty;

    private Long service;

    private Long maintenance;

    private Double maintenanceRate;
}
