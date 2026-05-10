package com.nkia.Orbis.domain.contract.orderreporthistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportServiceItem;
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
public class OrderReportServiceItemHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_history_id")
    private OrderReportHistory orderReportHistory;

    private String content;

    private Long manMonth;

    private Long price;

    private Long totalPrice;

    public static OrderReportServiceItemHistory create(
            OrderReportServiceItem item
    ) {
        OrderReportServiceItemHistory orderReportServiceItemHistory = new OrderReportServiceItemHistory();
        orderReportServiceItemHistory.content = item.getContent();
        orderReportServiceItemHistory.manMonth = item.getManMonth();
        orderReportServiceItemHistory.price = item.getPrice();
        orderReportServiceItemHistory.totalPrice = item.getTotalPrice();

        return orderReportServiceItemHistory;
    }

    void setOrderReportHistory(OrderReportHistory orderReportHistory) {
        this.orderReportHistory = orderReportHistory;
    }
}