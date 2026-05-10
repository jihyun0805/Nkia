package com.nkia.Orbis.domain.maintenance.maintenancequotation.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceQuotation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(unique = true, nullable = false)
    private String refNo;

    private LocalDate quotationDate;    // 견적 일자
    private String paymentTerms;        // 대금결제조건
    private Long totalAmount;           // 합계 금액
    private LocalDate startDate;        // 유지보수 시작일
    private LocalDate endDate;          // 유지보수 종료일
    private Long monthlySupplyPrice;    // 월 공급가
    private Long totalQuotationAmount;  // 견적 금액 합계

    @Column(columnDefinition = "TEXT")
    private String specialNotes;        // 특기사항

    // 패키지
    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaintenancePackageCost> packageCosts = new ArrayList<>();

    // 서비스 내용 리스트
    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaintenanceServiceInfo> serviceInfos = new ArrayList<>();

    // 금액산출근거표 리스트
    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaintenanceAmountReason> amountReasons = new ArrayList<>();

    @Builder
    public MaintenanceQuotation(String refNo, Project project, LocalDate quotationDate, String paymentTerms, Long totalAmount, LocalDate startDate, LocalDate endDate, Long monthlySupplyPrice, Long totalQuotationAmount, String specialNotes, Long spMaintenanceCost) {
        this.refNo = refNo;
        this.project = project;
        this.quotationDate = quotationDate;
        this.paymentTerms = paymentTerms;
        this.totalAmount = totalAmount;
        this.startDate = startDate;
        this.endDate = endDate;
        this.monthlySupplyPrice = monthlySupplyPrice;
        this.totalQuotationAmount = totalQuotationAmount;
        this.specialNotes = specialNotes;
    }

    public void addPackageCost(MaintenancePackageCost packageCost) {
        this.packageCosts.add(packageCost);
        packageCost.setQuotation(this);
    }

    public void addServiceDetail(MaintenanceServiceInfo Info) {
        this.serviceInfos.add(Info);
        Info.setQuotation(this);
    }

    public void addCostBasis(MaintenanceAmountReason amountReason) {
        this.amountReasons.add(amountReason);
        amountReason.setQuotation(this);
    }

    public void updateInfo(String paymentTerms, Long totalAmount, LocalDate startDate,
                           LocalDate endDate, Long monthlySupplyPrice,
                           Long totalQuotationAmount, String specialNotes) {
        this.paymentTerms = paymentTerms;
        this.totalAmount = totalAmount;
        this.startDate = startDate;
        this.endDate = endDate;
        this.monthlySupplyPrice = monthlySupplyPrice;
        this.totalQuotationAmount = totalQuotationAmount;
        this.specialNotes = specialNotes;
    }
}