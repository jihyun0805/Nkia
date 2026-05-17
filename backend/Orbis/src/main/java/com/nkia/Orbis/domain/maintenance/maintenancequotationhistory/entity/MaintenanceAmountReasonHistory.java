package com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceAmountReason;
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
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceAmountReasonHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "history_id", nullable = false)
    private MaintenanceQuotationHistory history;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_module_id")
    private ProductModule productModule;

    private Integer quantity;
    private Long amount;
    private Integer months;
    private String remarks;

    public static MaintenanceAmountReasonHistory create(MaintenanceAmountReason reason) {
        MaintenanceAmountReasonHistory history = new MaintenanceAmountReasonHistory();
        history.productModule = reason.getProductModule();
        history.quantity = reason.getQuantity();
        history.amount = reason.getAmount();
        history.months = reason.getMonths();
        history.remarks = reason.getRemarks();
        return history;
    }

    public void setHistory(MaintenanceQuotationHistory history) {
        this.history = history;
    }
}
