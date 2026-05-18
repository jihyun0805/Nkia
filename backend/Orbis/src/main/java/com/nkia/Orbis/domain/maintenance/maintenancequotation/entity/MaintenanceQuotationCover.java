package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.ManyToOne;
import java.time.LocalDate;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.admin.user.entity.User;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceQuotationCover extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    private MaintenanceQuotation quotation;

    @Enumerated(EnumType.STRING)
    private ProposalType proposalType;

    @Enumerated(EnumType.STRING)
    private ProductFamily productFamily;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    @Builder
    public MaintenanceQuotationCover(MaintenanceQuotation quotation,
                                     ProposalType proposalType, ProductFamily productFamily,
                                     User salesRepresentative) {
        this.quotation = quotation;
        this.proposalType = proposalType;
        this.productFamily = productFamily;
        this.salesRepresentative = salesRepresentative;
    }

    public void updateInfo(ProposalType proposalType, ProductFamily productFamily, User salesRepresentative) {
        this.proposalType = proposalType;
        this.productFamily = productFamily;
        this.salesRepresentative = salesRepresentative;
    }
}
