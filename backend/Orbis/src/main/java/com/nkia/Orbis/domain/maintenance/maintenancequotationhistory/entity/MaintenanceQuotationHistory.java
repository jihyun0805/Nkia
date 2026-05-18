package com.nkia.Orbis.domain.maintenance.maintenancequotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import com.nkia.Orbis.domain.project.project.entity.Project;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceQuotationHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer version;

    private String refNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    private LocalDate quotationDate;
    private String paymentTerms;
    private Long totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long monthlySupplyPrice;
    private Long totalQuotationAmount;

    @Column(columnDefinition = "TEXT")
    private String specialNotes;

    @OneToOne(mappedBy = "history", cascade = CascadeType.ALL, orphanRemoval = true)
    private MaintenanceQuotationCoverHistory cover;

    @OneToMany(mappedBy = "history", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaintenancePackageCostHistory> packageCosts = new ArrayList<>();

    @OneToMany(mappedBy = "history", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaintenanceServiceInfoHistory> serviceInfos = new ArrayList<>();

    @OneToMany(mappedBy = "history", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaintenanceAmountReasonHistory> amountReasons = new ArrayList<>();

    public static MaintenanceQuotationHistory create(MaintenanceQuotation quotation, Integer version) {
        MaintenanceQuotationHistory history = new MaintenanceQuotationHistory();
        history.version = version;
        history.refNo = quotation.getRefNo();
        history.project = quotation.getProject();
        history.quotationDate = quotation.getQuotationDate();
        history.paymentTerms = quotation.getPaymentTerms();
        history.totalAmount = quotation.getTotalAmount();
        history.startDate = quotation.getStartDate();
        history.endDate = quotation.getEndDate();
        history.monthlySupplyPrice = quotation.getMonthlySupplyPrice();
        history.totalQuotationAmount = quotation.getTotalQuotationAmount();
        history.specialNotes = quotation.getSpecialNotes();
        return history;
    }

    public void setCover(MaintenanceQuotationCoverHistory cover) {
        this.cover = cover;
        if (cover != null) {
            cover.setHistory(this);
        }
    }

    public void addPackageCost(MaintenancePackageCostHistory packageCost) {
        this.packageCosts.add(packageCost);
        packageCost.setHistory(this);
    }

    public void addServiceDetail(MaintenanceServiceInfoHistory info) {
        this.serviceInfos.add(info);
        info.setHistory(this);
    }

    public void addCostBasis(MaintenanceAmountReasonHistory amountReason) {
        this.amountReasons.add(amountReason);
        amountReason.setHistory(this);
    }

    @Override
    public void delete() {
        super.delete();
        if (this.cover != null) {
            this.cover.delete();
        }
        for (MaintenancePackageCostHistory packageCost : this.packageCosts) {
            packageCost.delete();
        }
        for (MaintenanceServiceInfoHistory info : this.serviceInfos) {
            info.delete();
        }
        for (MaintenanceAmountReasonHistory reason : this.amountReasons) {
            reason.delete();
        }
    }
}
