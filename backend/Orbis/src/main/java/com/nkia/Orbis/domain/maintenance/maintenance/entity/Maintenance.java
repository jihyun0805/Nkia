package com.nkia.Orbis.domain.maintenance.maintenance.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupport;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.admin.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
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
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Getter
public class Maintenance extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_rep_id")
    private User salesRep;              // 영업 (user)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_primary_id")
    private User managerPrimary;        // 변경(정) 담당자

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_secondary_id")
    private User managerSecondary;      // 변경(부) 담당자

    private String category;            // 구분
    private boolean isRemote;           // 원격 여부

    @Enumerated(EnumType.STRING)
    private InspectionCycle inspectionCycle;     // 점검주기

    @Enumerated(EnumType.STRING)
    private Importance importance;          // 중요도

    @Enumerated(EnumType.STRING)
    private MaintenanceType type;       // 유무상 (FREE, PAID)

    private String location;            // 위치
    private Double rate;                // 요율
    private Long contractAmount;        // 계약금액
    private Long annualAmount;          // 연간 유지보수 금액
    private LocalDate contractDate;     // 계약일
    private LocalDate startDate;        // 시작일
    private LocalDate endDate;          // 종료일
    private boolean reportSubmitted;    // 보고서제출여부

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "regular_pm_id")
    private User regularPm;             // 정기PM

    @Enumerated(EnumType.STRING)
    private ProdFamily productFamily;   // 제품군

    private String apVersion;           // AP버전
    private boolean aclPatchStatus;     // ACL패치여부
    private boolean vulnPatchStatus;    // 모니터템플릿 취약점 패치여부
    private String upgradePlan;         // LTS 8.4.0 업그레이드 계획
    private Integer apCount;            // AP수
    private Integer esCount;            // ES수
    private String esVersion;           // ES버전
    private boolean dbHaStatus;         // DB HA
    private String dbVersion;           // DB 버전

    @Column(columnDefinition = "TEXT")
    private String remarks;             // 비고

    @OneToOne(mappedBy = "maintenance", cascade = CascadeType.ALL, orphanRemoval = true)
    private CustomerSupport customerSupport;

    @Builder
    public Maintenance(
            Project project,
            User salesRep,
            User managerPrimary,
            User managerSecondary,
            String category,
            boolean isRemote,
            InspectionCycle inspectionCycle,
            Importance importance,
            MaintenanceType type,
            String location,
            Double rate,
            Long contractAmount,
            Long annualAmount,
            LocalDate contractDate,
            LocalDate startDate,
            LocalDate endDate,
            boolean reportSubmitted,
            User regularPm,
            ProdFamily productFamily,
            String apVersion,
            boolean aclPatchStatus,
            boolean vulnPatchStatus,
            String upgradePlan,
            Integer apCount,
            Integer esCount,
            String esVersion,
            boolean dbHaStatus,
            String dbVersion,
            String remarks
    ) {
        this.project = project;
        this.salesRep = salesRep;
        this.managerPrimary = managerPrimary;
        this.managerSecondary = managerSecondary;
        this.category = category;
        this.isRemote = isRemote;
        this.inspectionCycle = inspectionCycle;
        this.importance = importance;
        this.type = type;
        this.location = location;
        this.rate = rate;
        this.contractAmount = contractAmount;
        this.annualAmount = annualAmount;
        this.contractDate = contractDate;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reportSubmitted = reportSubmitted;
        this.regularPm = regularPm;
        this.productFamily = productFamily;
        this.apVersion = apVersion;
        this.aclPatchStatus = aclPatchStatus;
        this.vulnPatchStatus = vulnPatchStatus;
        this.upgradePlan = upgradePlan;
        this.apCount = apCount;
        this.esCount = esCount;
        this.esVersion = esVersion;
        this.dbHaStatus = dbHaStatus;
        this.dbVersion = dbVersion;
        this.remarks = remarks;
    }
}