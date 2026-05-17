package com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotationCover;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.ProductFamily;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.ProposalType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceQuotationCoverHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "history_id", nullable = false)
    private MaintenanceQuotationHistory history;

    @Enumerated(EnumType.STRING)
    private ProposalType proposalType;

    @Enumerated(EnumType.STRING)
    private ProductFamily productFamily;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    public static MaintenanceQuotationCoverHistory create(MaintenanceQuotationCover cover) {
        if (cover == null) return null;
        
        MaintenanceQuotationCoverHistory history = new MaintenanceQuotationCoverHistory();
        history.proposalType = cover.getProposalType();
        history.productFamily = cover.getProductFamily();
        history.salesRepresentative = cover.getSalesRepresentative();
        return history;
    }

    public void setHistory(MaintenanceQuotationHistory history) {
        this.history = history;
    }
}
