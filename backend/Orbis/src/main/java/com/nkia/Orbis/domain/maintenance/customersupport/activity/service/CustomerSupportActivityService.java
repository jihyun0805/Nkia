package com.nkia.Orbis.domain.maintenance.customersupport.activity.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportCreateRequest;
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
import java.util.List;
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


    /**
     * 고객지원 활동 결과를 신규 등록합니다.
     * 연관된 요청건, 계약 정보, 타부서 참여자 및 첨부파일을 하나의 트랜잭션으로 묶어서 저장합니다.
     */
    @Transactional
    public Long createActivity(CustomerSupportCreateRequest requestDto) {
        CustomerSupportRequest request = getRequestIfNecessary(requestDto.getActivityType(),
                requestDto.getRequestId());

        Maintenance maintenance = getMaintenanceIfNecessary(requestDto.getMaintenanceId());

        CustomerSupport support = createSupportEntity(requestDto, request, maintenance);

        mapParticipants(support, requestDto.getParticipantList());
        mapAttachedFiles(support, requestDto.getAttachedFileIds());

        supportRepository.save(support);

        return support.getId();
    }

    /**
     * 활동 유형이 '요청(REQUEST)' 기반일 경우, 원본 고객지원 요청 엔티티를 조회합니다.
     * 정기점검 등 요청 기반이 아닐 경우 null을 반환합니다.
     */
    private CustomerSupportRequest getRequestIfNecessary(ActivityType activityType, Long requestId) {
        if (activityType != ActivityType.REQUEST || requestId == null) {
            return null;
        }
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));
    }

    /**
     * 입력받은 유지보수 계약 ID가 존재할 경우, 연관관계 매핑을 위한 유지보수 계약 프록시 객체를 반환합니다.
     * DB 쿼리(Select)를 생략하기 위해 getReferenceById를 사용합니다.
     */
    private Maintenance getMaintenanceIfNecessary(Long contractId) {
        if (contractId == null) {
            return null;
        }
        return maintenanceRepository.getReferenceById(contractId);
    }

    /**
     * DTO 데이터와 사전에 조회한 연관 엔티티들을 조합하여
     * 새로운 고객지원 활동(CustomerSupport) 엔티티를 빌드합니다.
     */
    private CustomerSupport createSupportEntity(CustomerSupportCreateRequest dto,
                                                CustomerSupportRequest request,
                                                Maintenance maintenance) {
        return CustomerSupport.builder()
                .request(request)
                .maintenance(maintenance)
                .customerCompanyCode(dto.getCustomerCompanyCode())
                .activityType(dto.getActivityType())
                .activityStartTime(dto.getActivityStartTime())
                .activityEndTime(dto.getActivityEndTime())
                .activityContent(dto.getActivityContent())
                .registrantId(dto.getRegistrantId())
                .remarks(dto.getRemarks())
                .build();
    }

    /**
     * 타부서 참여자 리스트를 순회하며 매핑 엔티티를 생성하고,
     * 연관관계 편의 메서드를 통해 활동 결과 엔티티에 추가합니다.
     */
    private void mapParticipants(CustomerSupport support,
                                 List<CustomerSupportCreateRequest.ParticipantDto> participantList) {
        if (participantList == null || participantList.isEmpty()) {
            return;
        }
        for (CustomerSupportCreateRequest.ParticipantDto pDto : participantList) {
            CustomerSupportOtherDepartmentUser participant = CustomerSupportOtherDepartmentUser.builder()
                    .userId(pDto.getUserId())
                    .roleDescription(pDto.getRoleDescription())
                    .build();
            support.addOtherDepartmentUser(participant);
        }
    }

    /**
     * 첨부파일 ID 리스트를 기반으로 실제 파일 엔티티들을 조회한 후,
     * 연관관계 편의 메서드를 통해 활동 결과 엔티티에 추가합니다.
     */
    private void mapAttachedFiles(CustomerSupport support, List<Long> fileIds) {
        if (fileIds == null || fileIds.isEmpty()) {
            return;
        }
        List<UploadFile> files = uploadFileRepository.findAllById(fileIds);
        files.forEach(support::addAttachedFile);
    }
}
