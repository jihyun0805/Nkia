package com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceServiceInfo;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.ServiceCategory;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.ServiceItem;
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
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceServiceInfoHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "history_id", nullable = false)
    private MaintenanceQuotationHistory history;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_module_id")
    private ProductModule productModule;

    @Enumerated(EnumType.STRING)
    private ServiceCategory category;

    @Enumerated(EnumType.STRING)
    private ServiceItem item;

    private String content;

    public static MaintenanceServiceInfoHistory create(MaintenanceServiceInfo info) {
        MaintenanceServiceInfoHistory history = new MaintenanceServiceInfoHistory();
        history.productModule = info.getProductModule();
        history.category = info.getCategory();
        history.item = info.getItem();
        history.content = info.getContent();
        return history;
    }

    public void setHistory(MaintenanceQuotationHistory history) {
        this.history = history;
    }
}
