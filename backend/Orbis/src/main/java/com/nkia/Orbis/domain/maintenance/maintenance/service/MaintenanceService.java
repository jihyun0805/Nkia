package com.nkia.Orbis.domain.maintenance.maintenance.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.request.MaintenanceCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.repository.MaintenanceRepository;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.user.entity.User;
import com.nkia.Orbis.domain.user.repository.UserRepository;
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
        // 1. 사업 정보 조회
        Project project = projectRepository.findById(dto.getProjectId())
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));

        // 2. 영업대표(User) 조회
        User salesRep = getUserOrNull(dto.getSalesRepId());
        User primaryManager = getUserOrNull(dto.getManagerPrimary());
        User secondaryManager = getUserOrNull(dto.getManagerSecondary());
        User regularPm = getUserOrNull(dto.getRegularPm());

        // 4. 엔티티 생성
        Maintenance maintenance = Maintenance.builder()
                .project(project)
                .salesRep(salesRep)
                .managerPrimary(primaryManager)
                .managerSecondary(secondaryManager)
                .category(dto.getCategory())
                .isRemote(dto.isRemoteAvailable())          // DTO: remoteAvailable
                .inspectionCycle(dto.getInspectionCycle())    // DTO: inspectionCycle
                .importance(dto.getImportance())
                .type(dto.getMaintenanceType())                                 // Enum 타입
                .location(dto.getLocation())
                .rate(dto.getMaintenanceRate())             // DTO: maintenanceRate
                .contractAmount(dto.getContractAmount())
                .annualAmount(dto.getAnnualMaintenanceAmount()) // DTO: annualMaintenanceAmount
                .contractDate(dto.getContractDate())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .reportSubmitted(dto.isReportSubmission())  // DTO: reportSubmission
                .regularPm(regularPm)
                .productFamily(dto.getProductFamily())
                .apVersion(dto.getApVersion())
                .aclPatchStatus(dto.isAclPatchStatus())
                .vulnPatchStatus(dto.isVulnerabilityPatch())
                .upgradePlan(dto.getLtsUpgradePlan())       // DTO: ltsUpgradePlan
                .apCount(dto.getApCount())
                .esCount(dto.getEsCount())
                .esVersion(dto.getEsVersion())
                .dbHaStatus(dto.isDbHaStatus())
                .dbVersion(dto.getDbVersion())
                .remarks(dto.getRemarks())
                .build();

        return maintenanceRepository.save(maintenance).getId();
    }

    /**
     * 내부 Helper 메서드: ID가 비어있으면 null 반환, 있으면 검증 후 User 객체 반환
     */
    private User getUserOrNull(UUID userId) {
        // ID가 비어있거나 null이면 검색하지 않고 null을 반환
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }
}