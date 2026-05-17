package com.nkia.Orbis.domain.maintenance.maintenancehistory.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Importance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.InspectionCycle;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.ProdFamily;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
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
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Getter
@SQLRestriction("deleted = false")
public class MaintenanceHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_id", nullable = false)
    private Maintenance maintenance;

    @Column(nullable = false)
    private Integer version;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    private String salesRepName;
    private String managerPrimaryName;
    private String managerSecondaryName;

    private String category;
    private boolean isRemote;

    @Enumerated(EnumType.STRING)
    private InspectionCycle inspectionCycle;

    @Enumerated(EnumType.STRING)
    private Importance importance;

    @Enumerated(EnumType.STRING)
    private MaintenanceType type;

    private String location;
    private Double rate;
    private Long contractAmount;
    private Long annualAmount;
    private LocalDate contractDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean reportSubmitted;

    private String regularPmName;

    @Enumerated(EnumType.STRING)
    private ProdFamily productFamily;

    private String apVersion;
    private boolean aclPatchStatus;
    private boolean vulnPatchStatus;
    private String upgradePlan;
    private Integer apCount;
    private Integer esCount;
    private String esVersion;
    private boolean dbHaStatus;
    private String dbVersion;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_file_id")
    private UploadFile contractFile;

    public static MaintenanceHistory create(Maintenance m, Integer version) {
        MaintenanceHistory h = new MaintenanceHistory();
        h.maintenance = m;
        h.version = version;
        h.status = m.getStatus();
        h.project = m.getProject();
        h.salesRepName = m.getSalesRep() != null ? m.getSalesRep().getName() : null;
        h.managerPrimaryName = m.getManagerPrimary() != null ? m.getManagerPrimary().getName() : null;
        h.managerSecondaryName = m.getManagerSecondary() != null ? m.getManagerSecondary().getName() : null;
        h.category = m.getCategory();
        h.isRemote = m.isRemote();
        h.inspectionCycle = m.getInspectionCycle();
        h.importance = m.getImportance();
        h.type = m.getType();
        h.location = m.getLocation();
        h.rate = m.getRate();
        h.contractAmount = m.getContractAmount();
        h.annualAmount = m.getAnnualAmount();
        h.contractDate = m.getContractDate();
        h.startDate = m.getStartDate();
        h.endDate = m.getEndDate();
        h.reportSubmitted = m.isReportSubmitted();
        h.regularPmName = m.getRegularPm() != null ? m.getRegularPm().getName() : null;
        h.productFamily = m.getProductFamily();
        h.apVersion = m.getApVersion();
        h.aclPatchStatus = m.isAclPatchStatus();
        h.vulnPatchStatus = m.isVulnPatchStatus();
        h.upgradePlan = m.getUpgradePlan();
        h.apCount = m.getApCount();
        h.esCount = m.getEsCount();
        h.esVersion = m.getEsVersion();
        h.dbHaStatus = m.isDbHaStatus();
        h.dbVersion = m.getDbVersion();
        h.remarks = m.getRemarks();
        h.contractFile = m.getContractFile();
        return h;
    }
}
