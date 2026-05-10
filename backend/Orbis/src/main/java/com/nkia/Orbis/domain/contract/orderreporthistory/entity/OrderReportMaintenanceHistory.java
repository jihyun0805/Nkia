package com.nkia.Orbis.domain.contract.orderreporthistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportMaintenance;
import com.nkia.Orbis.domain.contract.orderreport.entity.VisitCycle;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
public class OrderReportMaintenanceHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_history_id")
    private OrderReportHistory orderReportHistory;

    private String content;

    @Enumerated(EnumType.STRING)
    private VisitCycle visitCycle;

    private Integer month;

    private Long price;

    private Long totalPrice;

    public static OrderReportMaintenanceHistory create(
            OrderReportMaintenance orderReportMaintenance
    ) {
        OrderReportMaintenanceHistory orderReportMaintenanceHistory = new OrderReportMaintenanceHistory();

        orderReportMaintenanceHistory.content = orderReportMaintenance.getContent();
        orderReportMaintenanceHistory.visitCycle = orderReportMaintenance.getVisitCycle();
        orderReportMaintenanceHistory.month = orderReportMaintenance.getMonth();
        orderReportMaintenanceHistory.price = orderReportMaintenance.getPrice();
        orderReportMaintenanceHistory.totalPrice = orderReportMaintenance.getTotalPrice();

        return orderReportMaintenanceHistory;
    }


    void setOrderReportHistory(OrderReportHistory orderReportHistory) {
        this.orderReportHistory = orderReportHistory;
    }
}