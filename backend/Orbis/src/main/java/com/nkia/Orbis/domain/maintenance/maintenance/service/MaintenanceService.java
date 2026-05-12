package com.nkia.Orbis.domain.maintenance.maintenance.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UploadFileErrorCode;
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
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final UploadFileRepository uploadFileRepository;
    private final UploadFileService uploadFileService;

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

        Maintenance maintenance = createMaintenanceEntity(dto, project, salesRep, primaryManager, secondaryManager, regularPm, contractFile);

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

        UploadFile contractFile = getUploadFile(dto.getContractFileId());
        maintenance.updateMaintenance(dto, salesRep, primary, secondary, regularPm, contractFile);

        return MaintenanceDetailResponse.from(maintenance);
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
    @Transactional(readOnly = true)
    public MaintenanceDetailResponse getMaintenanceDetail(Long id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        return MaintenanceDetailResponse.from(maintenance);
    }

    /**
     * 유지보수 (무상/유상) 목록 조회
     */
    @Transactional(readOnly = true)
    public List<MaintenanceListResponse> getMaintenanceList(MaintenanceType type) {
        List<Maintenance> list = maintenanceRepository.findAllByTypeOrderByIdDesc(type);

        return list.stream()
                .map(MaintenanceListResponse::from)
                .toList();
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
}