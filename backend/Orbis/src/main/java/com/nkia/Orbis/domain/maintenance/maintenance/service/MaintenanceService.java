package com.nkia.Orbis.domain.maintenance.maintenance.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.request.MaintenanceCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.request.MaintenanceUpdateRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.response.MaintenanceDetailResponse;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.response.MaintenanceListResponse;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import com.nkia.Orbis.domain.maintenance.maintenance.repository.MaintenanceRepository;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long maintenanceRegister(MaintenanceCreateRequest dto) {
        Project project = projectRepository.findById(dto.getProjectId())
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));

        User salesRep = getUserOrNull(dto.getSalesRepId());
        User primaryManager = getUserOrNull(dto.getManagerPrimary());
        User secondaryManager = getUserOrNull(dto.getManagerSecondary());
        User regularPm = getUserOrNull(dto.getRegularPm());

        Maintenance maintenance = Maintenance.builder()
                .project(project)
                .salesRep(salesRep)
                .managerPrimary(primaryManager)
                .managerSecondary(secondaryManager)
                .category(dto.getCategory())
                .isRemote(dto.isRemoteAvailable())
                .inspectionCycle(dto.getInspectionCycle())
                .importance(dto.getImportance())
                .type(dto.getMaintenanceType())
                .location(dto.getLocation())
                .rate(dto.getMaintenanceRate())
                .contractAmount(dto.getContractAmount())
                .annualAmount(dto.getAnnualMaintenanceAmount())
                .contractDate(dto.getContractDate())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .reportSubmitted(dto.isReportSubmission())
                .regularPm(regularPm)
                .productFamily(dto.getProductFamily())
                .apVersion(dto.getApVersion())
                .aclPatchStatus(dto.isAclPatchStatus())
                .vulnPatchStatus(dto.isVulnerabilityPatch())
                .upgradePlan(dto.getLtsUpgradePlan())
                .apCount(dto.getApCount())
                .esCount(dto.getEsCount())
                .esVersion(dto.getEsVersion())
                .dbHaStatus(dto.isDbHaStatus())
                .dbVersion(dto.getDbVersion())
                .remarks(dto.getRemarks())
                .build();

        return maintenanceRepository.save(maintenance).getId();
    }

    private User getUserOrNull(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }

    @Transactional
    public MaintenanceDetailResponse updateMaintenance(Long id, MaintenanceUpdateRequest dto) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        User salesRep = getUserOrNull(dto.getSalesRep());
        User primary = getUserOrNull(dto.getManagerPrimary());
        User secondary = getUserOrNull(dto.getManagerSecondary());
        User regularPm = getUserOrNull(dto.getRegularPm());

        maintenance.updateMaintenance(dto, salesRep, primary, secondary, regularPm);

        return MaintenanceDetailResponse.from(maintenance);
    }

    @Transactional
    public void deleteMaintenance(Long id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        maintenance.delete();
    }

    @Transactional(readOnly = true)
    public MaintenanceDetailResponse getMaintenanceDetail(Long id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        return MaintenanceDetailResponse.from(maintenance);
    }

    @Transactional(readOnly = true)
    public List<MaintenanceListResponse> getMaintenanceList(MaintenanceType type) {
        List<Maintenance> list = maintenanceRepository.findAllByTypeOrderByIdDesc(type);

        return list.stream()
                .map(MaintenanceListResponse::from)
                .toList();
    }
}