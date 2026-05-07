package com.nkia.Orbis.domain.contract.orderreport.dto.response;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportMaintenanceOnlyItem;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportMaintenanceOnlyItemResponse {

    private Long id;

    private Integer year;

    private Long amount;

    private Long license;

    private Long thirdParty;

    private Long service;

    private Long maintenance;

    private Double maintenanceRate;

    public static OrderReportMaintenanceOnlyItemResponse from(OrderReportMaintenanceOnlyItem item) {
        return OrderReportMaintenanceOnlyItemResponse.builder()
                .id(item.getId())
                .year(item.getYear())
                .amount(item.getAmount())
                .license(item.getLicense())
                .thirdParty(item.getThirdParty())
                .service(item.getService())
                .maintenance(item.getMaintenance())
                .maintenanceRate(item.getMaintenanceRate())
                .build();
    }
}
