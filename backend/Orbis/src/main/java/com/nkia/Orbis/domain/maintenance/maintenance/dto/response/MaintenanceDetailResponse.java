package com.nkia.Orbis.domain.maintenance.maintenance.dto.response;

import com.nkia.Orbis.domain.maintenance.maintenance.entity.Importance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.InspectionCycle;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.ProdFamily;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MaintenanceDetailResponse {

    private Long id;

    private Long projectId;
    private String projectName;
    private String customerName;

    private String salesRepName;
    private String managerPrimaryName;
    private String managerSecondaryName;
    private String regularPm;

    private MaintenanceType type; // FREE, PAID
    private boolean isRemote;
    private String category;
    private Long contractAmount;
    private Long annualAmount;
    private LocalDate contractDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean reportSubmitted;

    private InspectionCycle inspectionCycle;
    private Importance importance;
    private String location;
    private Double rate;
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
    private String remarks;
    private Long contractFileId;


    private String createdBy;
    private LocalDateTime createdAt;

    public static MaintenanceDetailResponse from(Maintenance m) {
        return MaintenanceDetailResponse.builder()
                .id(m.getId())
                .projectId(m.getProject().getId())
                .projectName(m.getProject().getPjtName())
                .customerName(m.getProject().getOrderReport().getFinalCustomerCompany().getName())
                .salesRepName(m.getSalesRep().getName())
                .regularPm(m.getRegularPm().getName())
                .managerPrimaryName(m.getManagerPrimary() != null ? m.getManagerPrimary().getName() : null)
                .managerSecondaryName(m.getManagerSecondary() != null ? m.getManagerSecondary().getName() : null)
                .type(m.getType()).category(m.getCategory())
                .isRemote(m.isRemote())
                .rate(m.getRate())
                .importance(m.getImportance())
                .reportSubmitted(m.isReportSubmitted())
                .contractAmount(m.getContractAmount()).annualAmount(m.getAnnualAmount())
                .startDate(m.getStartDate()).endDate(m.getEndDate())
                .contractDate(m.getContractDate())
                .inspectionCycle(m.getInspectionCycle()).location(m.getLocation())
                .productFamily(m.getProductFamily()).apVersion(m.getApVersion())
                .aclPatchStatus(m.isAclPatchStatus()).vulnPatchStatus(m.isVulnPatchStatus()).upgradePlan(m.getUpgradePlan())
                .apCount(m.getApCount()).esCount(m.getEsCount())
                .esVersion(m.getEsVersion()).dbHaStatus(m.isDbHaStatus())
                .dbVersion(m.getDbVersion())
                .remarks(m.getRemarks()).createdBy(m.getCreatedBy()).createdAt(m.getCreatedAt())
                .contractFileId(m.getContractFile() != null ? m.getContractFile().getId() : null)
                .build();
    }
}
