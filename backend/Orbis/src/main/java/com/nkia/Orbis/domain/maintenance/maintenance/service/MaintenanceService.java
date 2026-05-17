package com.nkia.Orbis.domain.maintenance.maintenance.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UploadFileErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowRepository;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import com.nkia.Orbis.domain.maintenance.maintenancehistory.dto.response.MaintenanceHistoryDetailResponse;
import com.nkia.Orbis.domain.maintenance.maintenancehistory.dto.response.MaintenanceHistoryListResponse;
import com.nkia.Orbis.domain.maintenance.maintenancehistory.entity.MaintenanceHistory;
import com.nkia.Orbis.domain.maintenance.maintenancehistory.repository.MaintenanceHistoryRepository;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.request.MaintenanceCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.request.MaintenanceUpdateRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.response.MaintenanceDetailResponse;
import com.nkia.Orbis.domain.maintenance.maintenance.dto.response.MaintenanceListResponse;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import com.nkia.Orbis.domain.maintenance.maintenance.repository.MaintenanceRepository;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import com.nkia.Orbis.domain.uploadfile.service.UploadFileService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final UploadFileRepository uploadFileRepository;
    private final UploadFileService uploadFileService;
    private final WorkflowRepository workflowRepository;
    private final WorkflowService workflowService;
    private final MaintenanceHistoryRepository maintenanceHistoryRepository;

    /**
     * 유지보수 (무상/유상) 신규 등록
     */
    @Transactional
    public Long maintenanceRegister(MaintenanceCreateRequest dto) {
        Project project = projectRepository.findById(dto.getProjectId())
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));

        User salesRep = getUserOrNull(dto.getSalesRep());
        User primaryManager = getUserOrNull(dto.getManagerPrimary());
        User secondaryManager = getUserOrNull(dto.getManagerSecondary());
        User regularPm = getUserOrNull(dto.getRegularPm());
        UploadFile contractFile = getUploadFile(dto.getContractFileId());

        Maintenance maintenance = createMaintenanceEntity(dto, project, salesRep, primaryManager, secondaryManager,
                regularPm, contractFile);

        return maintenanceRepository.save(maintenance).getId();
    }

    /**
     * 유지보수 엔티티 생성
     */
    private Maintenance createMaintenanceEntity(MaintenanceCreateRequest dto, Project project, User salesRep,
            User primary, User secondary, User regularPm, UploadFile contractFile) {
        return Maintenance.builder()
                .project(project)
                .salesRep(salesRep)
                .managerPrimary(primary)
                .managerSecondary(secondary)
                .category(dto.getCategory())
                .isRemote(dto.isRemote())
                .inspectionCycle(dto.getInspectionCycle())
                .importance(dto.getImportance())
                .type(dto.getType())
                .location(dto.getLocation())
                .rate(dto.getRate())
                .contractAmount(dto.getContractAmount())
                .annualAmount(dto.getAnnualAmount())
                .contractDate(dto.getContractDate())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .reportSubmitted(dto.isReportSubmitted())
                .regularPm(regularPm)
                .productFamily(dto.getProductFamily())
                .apVersion(dto.getApVersion())
                .aclPatchStatus(dto.isAclPatchStatus())
                .vulnPatchStatus(dto.isVulnPatchStatus())
                .upgradePlan(dto.getUpgradePlan())
                .apCount(dto.getApCount())
                .esCount(dto.getEsCount())
                .esVersion(dto.getEsVersion())
                .dbHaStatus(dto.isDbHaStatus())
                .dbVersion(dto.getDbVersion())
                .remarks(dto.getRemarks())
                .contractFile(contractFile)
                .build();
    }

    /**
     * ID로 사용자 조회 (없을 경우 null 반환)
     */
    private User getUserOrNull(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }

    /**
     * 유지보수 정보 수정 (계약서 파일 포함)
     */
    @Transactional
    public MaintenanceDetailResponse updateMaintenance(Long id, MaintenanceUpdateRequest dto) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        User salesRep = getUserOrNull(dto.getSalesRep());
        User primary = getUserOrNull(dto.getManagerPrimary());
        User secondary = getUserOrNull(dto.getManagerSecondary());
        User regularPm = getUserOrNull(dto.getRegularPm());

        handleContractFileUpdate(maintenance, dto.getContractFileId());

        saveSnapshot(maintenance);

        UploadFile contractFile = getUploadFile(dto.getContractFileId());
        maintenance.updateMaintenance(dto, salesRep, primary, secondary, regularPm, contractFile);

        String creatorName = getUserNameByUuidString(maintenance.getCreatedBy());
        String updaterName = getUserNameByUuidString(maintenance.getUpdatedBy());

        return MaintenanceDetailResponse.from(maintenance, getWorkflowId(maintenance), creatorName, updaterName);
    }

    /**
     * 계약서 파일 업데이트 및 기존 파일 소프트 삭제 처리
     */
    private void handleContractFileUpdate(Maintenance maintenance, Long newFileId) {
        if (newFileId != null) {
            if (maintenance.getContractFile() != null && !maintenance.getContractFile().getId().equals(newFileId)) {
                maintenance.getContractFile().delete();
            }
        } else {
            if (maintenance.getContractFile() != null) {
                maintenance.getContractFile().delete();
            }
        }
    }

    /**
     * 유지보수 및 연관 데이터(파일, 고객지원활동) 소프트 삭제
     */
    @Transactional
    public void deleteMaintenance(Long id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        if (maintenance.getContractFile() != null) {
            maintenance.getContractFile().delete();
        }

        if (maintenance.getCustomerSupport() != null) {
            maintenance.getCustomerSupport().delete();
        }

        maintenance.delete();
    }

    /**
     * 유지보수 상세 조회
     */
    public MaintenanceDetailResponse getMaintenanceDetail(Long id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        String creatorName = getUserNameByUuidString(maintenance.getCreatedBy());
        String updaterName = getUserNameByUuidString(maintenance.getUpdatedBy());

        return MaintenanceDetailResponse.from(maintenance, getWorkflowId(maintenance), creatorName, updaterName);
    }

    /**
     * 유지보수 (무상/유상) 목록 조회
     */
    public List<MaintenanceListResponse> getMaintenanceList(MaintenanceType type) {
        List<Maintenance> list = maintenanceRepository.findAllByTypeOrderByIdDesc(type);

        return list.stream()
                .map(MaintenanceListResponse::from)
                .toList();
    }

    public List<MaintenanceHistoryListResponse> getHistories(Long maintenanceId) {
        if (!maintenanceRepository.existsById(maintenanceId)) {
            throw new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND);
        }
        List<MaintenanceHistory> histories = maintenanceHistoryRepository
                .findByMaintenanceIdOrderByVersionDesc(maintenanceId);
        return histories.stream()
                .map(MaintenanceHistoryListResponse::from)
                .toList();
    }

    public MaintenanceHistoryDetailResponse getHistoryDetail(Long historyId) {
        MaintenanceHistory history = maintenanceHistoryRepository.findById(historyId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        Long workflowId = getWorkflowId(history.getMaintenance());
        String creatorName = getUserNameByUuidString(history.getCreatedBy());
        String updaterName = getUserNameByUuidString(history.getUpdatedBy());
        return MaintenanceHistoryDetailResponse.from(history, workflowId, creatorName, updaterName);
    }

    private void saveSnapshot(Maintenance m) {
        int nextVersion = (int) maintenanceHistoryRepository.countByMaintenanceId(m.getId()) + 1;
        MaintenanceHistory history = MaintenanceHistory.create(m, nextVersion);
        maintenanceHistoryRepository.save(history);
    }

    private String getUserNameByUuidString(String uuidStr) {
        if (uuidStr == null || uuidStr.isBlank()) {
            return "-";
        }
        try {
            UUID uuid = UUID.fromString(uuidStr);
            return userRepository.findById(uuid)
                    .map(User::getName)
                    .orElse("알 수 없음");
        } catch (IllegalArgumentException e) {
            return uuidStr;
        }
    }

    /**
     * ID로 파일 엔티티 조회
     */
    private UploadFile getUploadFile(Long fileId) {
        if (fileId == null) {
            return null;
        }
        return uploadFileRepository.findById(fileId)
                .orElseThrow(() -> new ApiException(UploadFileErrorCode.FILE_NOT_FOUND));
    }

    @Transactional
    public void submitMaintenance(
            Long maintenanceId,
            UUID firstApproverId) {
        Maintenance maintenance = maintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        if (!maintenance.isDraft()) {
            throw new ApiException(MaintenanceErrorCode.INVALID_MAINTENANCE_STATUS);
        }

        UUID requesterId = UUID.fromString(SecurityUtil.getCurrentUserId());

        WorkflowDomain workflowDomain = resolveWorkflowDomain(maintenance);

        Workflow workflow = workflowService.startWorkflow(
                workflowDomain,
                maintenance.getId(),
                requesterId,
                firstApproverId);

        maintenance.submit();
    }

    private Long getWorkflowId(Maintenance maintenance) {

        WorkflowDomain workflowDomain = resolveWorkflowDomain(maintenance);

        return workflowRepository
                .findByWorkflowDomainAndTargetIdAndStatus(
                        workflowDomain,
                        maintenance.getId(),
                        WorkflowStatus.IN_PROGRESS)
                .map(Workflow::getId)
                .orElse(null);
    }

    private WorkflowDomain resolveWorkflowDomain(Maintenance maintenance) {
        if (maintenance.getType() == MaintenanceType.FREE) {
            return WorkflowDomain.FREE_MAINTENANCE_CONTRACT;
        }

        return WorkflowDomain.PAID_MAINTENANCE_CONTRACT;
    }
}