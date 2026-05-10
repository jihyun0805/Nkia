package com.nkia.Orbis.domain.contract.orderreporthistory.dto.response;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportMaintenanceOnlyItemHistory;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportMaintenanceOnlyItemHistoryResponse {

    private Long id;

    private Integer year;

    private Long amount;

    private Long license;

    private Long thirdParty;

    private Long service;

    private Long maintenance;

    private Double maintenanceRate;

    public static OrderReportMaintenanceOnlyItemHistoryResponse from(OrderReportMaintenanceOnlyItemHistory item) {
        return OrderReportMaintenanceOnlyItemHistoryResponse.builder()
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
