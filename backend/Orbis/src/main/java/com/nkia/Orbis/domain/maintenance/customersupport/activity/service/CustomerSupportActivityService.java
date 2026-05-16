package com.nkia.Orbis.domain.maintenance.customersupport.activity.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportUpdateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response.CustomerSupportDetailResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response.CustomerSupportHistoryDetailResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response.CustomerSupportHistoryListResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response.IntegratedSupportListResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.ActivityType;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupport;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupportHistory;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupportOtherDepartmentUser;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.SupportDataType;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.repository.CustomerSupportHistoryRepository;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.repository.CustomerSupportRepository;
import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.repository.CustomerSupportRequestRepository;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.repository.MaintenanceRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.repository.CompanyRepository;
import com.nkia.Orbis.common.exception.errorcode.CompanyErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.uploadfile.service.UploadFileService;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerSupportActivityService {
    private final CustomerSupportRepository supportRepository;
    private final CustomerSupportHistoryRepository historyRepository;
    private final CustomerSupportRequestRepository requestRepository;
    private final UploadFileRepository uploadFileRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final UploadFileService uploadFileService;

    /**
     * 고객지원 활동 결과 등록
     */
    @Transactional
    public Long createActivity(CustomerSupportCreateRequest requestDto) {
        CustomerSupportRequest request = getRequestIfNecessary(requestDto.getActivityType(),
                requestDto.getRequestId());

        Maintenance maintenance = getMaintenanceIfNecessary(requestDto.getMaintenanceId());

        User registrant = getUserOrNull(requestDto.getRegistrantId());
        Company customerCompany = getCompanyOrNull(requestDto.getCustomerCompanyCode());

        CustomerSupport support = createSupportEntity(requestDto, request, maintenance, registrant, customerCompany);

        mapParticipants(support, requestDto.getParticipantList());
        mapAttachedFiles(support, requestDto.getAttachedFileIds());

        supportRepository.save(support);

        // 히스토리 생성 (등록 시점)
        historyRepository.save(CustomerSupportHistory.createSnapshot(support));

        return support.getId();
    }

    /**
     * 고객지원 활동 결과 수정
     */
    @Transactional
    public CustomerSupportDetailResponse updateActivity(Long id, CustomerSupportUpdateRequest dto) {
        CustomerSupport support = supportRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.ACTIVITY_NOT_FOUND));

        Company company = getCompanyOrNull(dto.getCustomerCompanyCode());
        User registrant = getUserOrNull(dto.getRegistrantId());

        support.update(company, dto.getActivityType(), dto.getActivityStartTime(),
                dto.getActivityEndTime(), dto.getActivityContent(), registrant, dto.getRemarks());

        support.clearCollections();
        mapParticipants(support, dto.getParticipantList());
        mapAttachedFiles(support, dto.getAttachedFileIds());

        // 히스토리 생성 (수정 시점)
        historyRepository.save(CustomerSupportHistory.createSnapshot(support));

        return CustomerSupportDetailResponse.from(support);
    }

    /**
     * 고객지원 활동 결과 삭제
     */
    @Transactional
    public void deleteActivity(Long id) {
        CustomerSupport support = supportRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.ACTIVITY_NOT_FOUND));

        support.getAttachedFiles().forEach(UploadFile::delete);

        support.delete();
    }

    /**
     * 고객지원 통합 현황 조회
     */
    public List<IntegratedSupportListResponse> getIntegratedStatus() {
        List<IntegratedSupportListResponse> requests = requestRepository.findAll().stream()
                .map(this::mapToRequestStatus).toList();

        List<IntegratedSupportListResponse> activities = supportRepository.findAll().stream()
                .map(this::mapToActivityStatus).toList();

        return Stream.concat(requests.stream(), activities.stream())
                .sorted(Comparator.comparing(IntegratedSupportListResponse::getStartAt).reversed())
                .toList();
    }

    /**
     * 고객지원 활동 결과 상세 조회
     */
    public CustomerSupportDetailResponse getActivityDetail(Long id) {
        CustomerSupport support = supportRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.ACTIVITY_NOT_FOUND));

        return CustomerSupportDetailResponse.from(support);
    }

    /**
     * 고객지원 활동 이력(히스토리) 목록 조회
     */
    public List<CustomerSupportHistoryListResponse> getActivityHistories(Long id) {
        List<CustomerSupportHistory> histories = historyRepository.findByOriginalActivityIdOrderByCreatedAtDesc(id);
        
        return histories.stream()
                .map(CustomerSupportHistoryListResponse::from)
                .toList();
    }

    /**
     * 고객지원 활동 특정 이력(히스토리) 상세 조회
     */
    public CustomerSupportHistoryDetailResponse getActivityHistoryDetail(Long historyId) {
        CustomerSupportHistory history = historyRepository.findById(historyId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.ACTIVITY_HISTORY_NOT_FOUND));

        return CustomerSupportHistoryDetailResponse.from(history);
    }

    /**
     * 통합 현황 데이터 변환 (요청)
     */
    private IntegratedSupportListResponse mapToRequestStatus(CustomerSupportRequest req) {
        return IntegratedSupportListResponse.builder()
                .dataType(SupportDataType.REQUEST)
                .id(req.getId())
                .customerName(req.getCustomerCompany() != null ? req.getCustomerCompany().getName() : "-")
                .startAt(req.getRequestStartDate() != null ? req.getRequestStartDate().atStartOfDay() : null)
                .endAt(req.getRequestEndDate() != null ? req.getRequestEndDate().atStartOfDay() : null)
                .ownerName(req.getRequester() != null ? req.getRequester().getName() : "-")
                .salesRepName(req.getSalesRep() != null ? req.getSalesRep().getName() : "-")
                .supportManagerName(req.getSupportManager() != null ? req.getSupportManager().getName() : "-")
                .build();
    }

    /**
     * 통합 현황 데이터 변환 (활동)
     */
    private IntegratedSupportListResponse mapToActivityStatus(CustomerSupport act) {
        String category = (act.getActivityType() == ActivityType.REQUEST && act.getRequest() != null)
                ? "요청 (#" + act.getRequest().getId() + ")"
                : (act.getActivityType() != null ? act.getActivityType().getDescription() : "-");

        return IntegratedSupportListResponse.builder()
                .dataType(SupportDataType.ACTIVITY)
                .id(act.getId())
                .customerName(act.getCustomerCompany() != null ? act.getCustomerCompany().getName() : "-")
                .activityCategory(category)
                .startAt(act.getActivityStartTime())
                .endAt(act.getActivityEndTime())
                .ownerName(act.getRegistrant() != null ? act.getRegistrant().getName() : "-")
                .build();
    }

    /**
     * 고객지원 요청 엔티티 조회
     */
    private CustomerSupportRequest getRequestIfNecessary(ActivityType activityType, Long requestId) {
        if (activityType != ActivityType.REQUEST || requestId == null) {
            return null;
        }
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));
    }

    /**
     * 유지보수 계약 엔티티 조회
     */
    private Maintenance getMaintenanceIfNecessary(Long contractId) {
        if (contractId == null) {
            return null;
        }
        return maintenanceRepository.getReferenceById(contractId);
    }

    /**
     * 고객지원 활동 엔티티 생성
     */
    private CustomerSupport createSupportEntity(CustomerSupportCreateRequest dto,
            CustomerSupportRequest request,
            Maintenance maintenance,
            User registrant,
            Company customerCompany) {
        return CustomerSupport.builder()
                .request(request)
                .maintenance(maintenance)
                .customerCompany(customerCompany)
                .activityType(dto.getActivityType())
                .activityStartTime(dto.getActivityStartTime())
                .activityEndTime(dto.getActivityEndTime())
                .activityContent(dto.getActivityContent())
                .registrant(registrant)
                .remarks(dto.getRemarks())
                .build();
    }

    /**
     * 참여자 정보 매핑
     */
    private void mapParticipants(CustomerSupport support,
            List<CustomerSupportCreateRequest.ParticipantDto> participantList) {
        if (participantList == null || participantList.isEmpty()) {
            return;
        }
        for (CustomerSupportCreateRequest.ParticipantDto pDto : participantList) {
            User participantUser = getUserOrNull(pDto.getUserId());
            CustomerSupportOtherDepartmentUser participant = CustomerSupportOtherDepartmentUser.builder()
                    .user(participantUser)
                    .roleDescription(pDto.getRoleDescription())
                    .build();
            support.addOtherDepartmentUser(participant);
        }
    }

    /**
     * 첨부파일 매핑
     */
    private void mapAttachedFiles(CustomerSupport support, List<Long> fileIds) {
        if (fileIds == null || fileIds.isEmpty()) {
            return;
        }
        List<UploadFile> files = uploadFileRepository.findAllById(fileIds);
        files.forEach(support::addAttachedFile);
    }

    /**
     * 사용자 엔티티 조회
     */
    private User getUserOrNull(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }

    /**
     * 고객사 엔티티 조회
     */
    private Company getCompanyOrNull(Long companyId) {
        if (companyId == null) {
            return null;
        }
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));
    }
}
