package com.nkia.Orbis.domain.contract.orderreport.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
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
public class OrderReportMaintenanceOnlyItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_id")
    private OrderReport orderReport;

    private Integer year;

    private Long amount;

    private Long license;

    private Long thirdParty;

    private Long service;

    private Long maintenance;

    private Double maintenanceRate;

    public static OrderReportMaintenanceOnlyItem create(
            Integer year,
            Long amount,
            Long license,
            Long thirdParty,
            Long service,
            Long maintenance,
            Double maintenanceRate
    ) {
        OrderReportMaintenanceOnlyItem orderReportMaintenanceOnlyItem = new OrderReportMaintenanceOnlyItem();
        orderReportMaintenanceOnlyItem.year = year;
        orderReportMaintenanceOnlyItem.amount = amount;
        orderReportMaintenanceOnlyItem.license = license;
        orderReportMaintenanceOnlyItem.thirdParty = thirdParty;
        orderReportMaintenanceOnlyItem.service = service;
        orderReportMaintenanceOnlyItem.maintenance = maintenance;
        orderReportMaintenanceOnlyItem.maintenanceRate = maintenanceRate;

        return orderReportMaintenanceOnlyItem;
    }

    void setOrderReport(OrderReport orderReport) {
        this.orderReport = orderReport;
    }
}