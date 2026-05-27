package com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenancePackageCost;
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
public class MaintenancePackageCostHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "history_id", nullable = false)
    private MaintenanceQuotationHistory history;

    private String packageName;
    private Long amount;

    public static MaintenancePackageCostHistory create(MaintenancePackageCost cost) {
        MaintenancePackageCostHistory history = new MaintenancePackageCostHistory();
        history.packageName = cost.getPackageName();
        history.amount = cost.getAmount();
        return history;
    }

    public void setHistory(MaintenanceQuotationHistory history) {
        this.history = history;
    }
}
