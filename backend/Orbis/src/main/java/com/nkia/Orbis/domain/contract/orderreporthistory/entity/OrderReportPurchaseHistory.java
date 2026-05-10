package com.nkia.Orbis.domain.contract.orderreporthistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportPurchase;
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
public class OrderReportPurchaseHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_history_id")
    private OrderReportHistory orderReportHistory;

    private String content;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static OrderReportPurchaseHistory create(
            OrderReportPurchase orderReportPurchase
    ) {
        OrderReportPurchaseHistory orderReportPurchaseHistory = new OrderReportPurchaseHistory();

        orderReportPurchaseHistory.content = orderReportPurchase.getContent();
        orderReportPurchaseHistory.quantity = orderReportPurchase.getQuantity();
        orderReportPurchaseHistory.price = orderReportPurchase.getPrice();
        orderReportPurchaseHistory.totalPrice = orderReportPurchase.getTotalPrice();

        return orderReportPurchaseHistory;
    }

    void setOrderReportHistory(OrderReportHistory orderReportHistory) {
        this.orderReportHistory = orderReportHistory;
    }
}