package com.nkia.Orbis.domain.contract.orderreporthistory.dto.response;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportHistory;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportHistoryListResponse {
    private Long id;

    private String orderReportCode;

    private Integer version;

    private LocalDateTime orderReportDate;


    public static OrderReportHistoryListResponse from(OrderReportHistory orderReportHistory) {
        return OrderReportHistoryListResponse.builder()
                .id(orderReportHistory.getId())
                .orderReportCode(orderReportHistory.getOrderReportCode())
                .version(orderReportHistory.getVersion())
                .orderReportDate(orderReportHistory.getOrderReportDate())
                .build();
    }
}
