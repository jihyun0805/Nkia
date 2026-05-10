package com.nkia.Orbis.domain.maintenance.customersupport.activity.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportUpdateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response.CustomerSupportDetailResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.ActivityType;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupport;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupportOtherDepartmentUser;
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
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerSupportActivityService {
    private final CustomerSupportRepository supportRepository;
    private final CustomerSupportRequestRepository requestRepository;
    private final UploadFileRepository uploadFileRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;


    /**
     * 고객지원 활동 결과 신규 등록
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

        return CustomerSupportDetailResponse.from(support);
    }

    private CustomerSupportRequest getRequestIfNecessary(ActivityType activityType, Long requestId) {
        if (activityType != ActivityType.REQUEST || requestId == null) {
            return null;
        }
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));
    }

    private Maintenance getMaintenanceIfNecessary(Long contractId) {
        if (contractId == null) {
            return null;
        }
        return maintenanceRepository.getReferenceById(contractId);
    }

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

    private void mapAttachedFiles(CustomerSupport support, List<Long> fileIds) {
        if (fileIds == null || fileIds.isEmpty()) {
            return;
        }
        List<UploadFile> files = uploadFileRepository.findAllById(fileIds);
        files.forEach(support::addAttachedFile);
    }

    private User getUserOrNull(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }

    private Company getCompanyOrNull(Long companyId) {
        if (companyId == null) {
            return null;
        }
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));
    }
}
