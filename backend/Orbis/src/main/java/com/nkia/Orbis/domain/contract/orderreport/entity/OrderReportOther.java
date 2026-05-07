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
public class OrderReportOther extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_id")
    private OrderReport orderReport;

    private String content;

    private Integer quantity;

    private Long price;

    private Long totalPrice;

    public static OrderReportOther create(
            String content,
            Integer quantity,
            Long price
    ) {
        OrderReportOther orderReportOther = new OrderReportOther();
        orderReportOther.content = content;
        orderReportOther.quantity = quantity;
        orderReportOther.price = price;
        orderReportOther.totalPrice = price * quantity;

        return orderReportOther;
    }

    void setOrderReport(OrderReport orderReport) {
        this.orderReport = orderReport;
    }
}