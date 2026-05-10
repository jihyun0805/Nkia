package com.nkia.Orbis.domain.contract.orderreporthistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportMaintenanceOnlyItem;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;


@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderReportMaintenanceOnlyItemHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_history_id")
    private OrderReportHistory orderReportHistory;

    private Integer year;

    private Long amount;

    private Long license;

    private Long thirdParty;

    private Long service;

    private Long maintenance;

    private Double maintenanceRate;

    public static OrderReportMaintenanceOnlyItemHistory create(
            OrderReportMaintenanceOnlyItem item
    ) {
        OrderReportMaintenanceOnlyItemHistory orderReportMaintenanceOnlyItemHistory = new OrderReportMaintenanceOnlyItemHistory();
        orderReportMaintenanceOnlyItemHistory.year = item.getYear();
        orderReportMaintenanceOnlyItemHistory.amount = item.getAmount();
        orderReportMaintenanceOnlyItemHistory.license = item.getLicense();
        orderReportMaintenanceOnlyItemHistory.thirdParty = item.getThirdParty();
        orderReportMaintenanceOnlyItemHistory.service = item.getService();
        orderReportMaintenanceOnlyItemHistory.maintenance = item.getMaintenance();
        orderReportMaintenanceOnlyItemHistory.maintenanceRate = item.getMaintenanceRate();

        return orderReportMaintenanceOnlyItemHistory;
    }

    void setOrderReportHistory(OrderReportHistory orderReportHistory) {
        this.orderReportHistory = orderReportHistory;
    }
}