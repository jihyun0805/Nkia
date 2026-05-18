package com.nkia.Orbis.domain.maintenance.maintenancehistory.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Importance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.InspectionCycle;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.ProdFamily;
import com.nkia.Orbis.domain.maintenance.maintenancehistory.entity.MaintenanceHistory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MaintenanceHistoryDetailResponse {

    private Long id;
    private Integer version;

    private Long workflowId;
    private ApprovalStatus status;

    private Long projectId;
    private String projectName;
    private String customerName;

    private String salesRepName;
    private String managerPrimaryName;
    private String managerSecondaryName;
    private String regularPm;

    private MaintenanceType type;
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
    private String updatedBy;
    private LocalDateTime createdAt;

    public static MaintenanceHistoryDetailResponse from(MaintenanceHistory h, Long workflowId, String creatorName, String updaterName) {
        String customerName = h.getProject() != null && h.getProject().getOrderReport() != null &&
                h.getProject().getOrderReport().getFinalCustomerCompany() != null ?
                h.getProject().getOrderReport().getFinalCustomerCompany().getName() : "-";

        return MaintenanceHistoryDetailResponse.builder()
                .id(h.getId())
                .version(h.getVersion())
                .projectId(h.getProject() != null ? h.getProject().getId() : null)
                .projectName(h.getProject() != null ? h.getProject().getPjtName() : "-")
                .customerName(customerName)
                .salesRepName(h.getSalesRepName())
                .regularPm(h.getRegularPmName())
                .managerPrimaryName(h.getManagerPrimaryName())
                .managerSecondaryName(h.getManagerSecondaryName())
                .type(h.getType())
                .category(h.getCategory())
                .isRemote(h.isRemote())
                .rate(h.getRate())
                .importance(h.getImportance())
                .reportSubmitted(h.isReportSubmitted())
                .contractAmount(h.getContractAmount())
                .annualAmount(h.getAnnualAmount())
                .startDate(h.getStartDate())
                .endDate(h.getEndDate())
                .contractDate(h.getContractDate())
                .inspectionCycle(h.getInspectionCycle())
                .location(h.getLocation())
                .productFamily(h.getProductFamily())
                .apVersion(h.getApVersion())
                .aclPatchStatus(h.isAclPatchStatus())
                .vulnPatchStatus(h.isVulnPatchStatus())
                .upgradePlan(h.getUpgradePlan())
                .apCount(h.getApCount())
                .esCount(h.getEsCount())
                .esVersion(h.getEsVersion())
                .dbHaStatus(h.isDbHaStatus())
                .dbVersion(h.getDbVersion())
                .remarks(h.getRemarks())
                .createdBy(creatorName)
                .updatedBy(updaterName)
                .createdAt(h.getCreatedAt())
                .contractFileId(h.getContractFile() != null ? h.getContractFile().getId() : null)
                .status(h.getStatus())
                .workflowId(workflowId)
                .build();
    }
}
