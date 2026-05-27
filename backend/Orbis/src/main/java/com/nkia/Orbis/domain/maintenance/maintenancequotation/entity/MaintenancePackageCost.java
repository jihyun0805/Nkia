package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

/**
 * 유지보수 패키지별 비용 상세 엔티티
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenancePackageCost extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @SQLRestriction("deleted = false")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id")
    private MaintenanceQuotation quotation;

    private String packageName; // 구분 (e.g. Solution Package)
    private Long amount;        // 해당 내용 합계

    @Builder
    public MaintenancePackageCost(String packageName, Long amount) {
        this.packageName = packageName;
        this.amount = amount;
    }

    public void setQuotation(MaintenanceQuotation quotation) {
        this.quotation = quotation;
    }
    public void delete() {
        super.delete();
    }
}
