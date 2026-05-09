package com.nkia.Orbis.domain.maintenance.customersupport.request.service;

import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestUpdateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response.CustomerSupportRequestDetailResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.repository.CustomerSupportRequestRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerSupportRequestService {

    private final CustomerSupportRequestRepository requestRepository;
    private final UploadFileRepository uploadFileRepository;
    private final UserRepository userRepository;

    /**
     * 고객지원 요청 등록
     */
    @Transactional
    public Long createRequest(CustomerSupportRequestCreateRequest requestDto) {
        User requester = getUserOrNull(requestDto.getRequesterId());
        User registrant = getUserOrNull(requestDto.getRegistrantId());
        User salesRep = getUserOrNull(requestDto.getSalesRepId());
        User supportManager = getUserOrNull(requestDto.getSupportManagerId());

        CustomerSupportRequest request = createRequestEntity(requestDto, requester, registrant, salesRep, supportManager);

        mapAttachedFiles(request, requestDto.getAttachedFileIds());

        requestRepository.save(request);

        // TODO: 등록 완료 후 권한 보유자(담당자/팀장 등)에게 알림(Notification) 전송 로직 호출

        return request.getId();
    }

    /**
     * 고객지원 요청 수정
     */
    @Transactional
    public CustomerSupportRequestDetailResponse updateRequest(Long id, CustomerSupportRequestUpdateRequest dto) {
        CustomerSupportRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        User requester = userRepository.findById(dto.getRequesterId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
        User supportManager = getUserOrNull(dto.getSupportManagerId());

        request.update(dto, requester, supportManager);
        updateAttachedFiles(request, dto.getAttachedFileIds());

        return CustomerSupportRequestDetailResponse.from(request);
    }

    private CustomerSupportRequest createRequestEntity(CustomerSupportRequestCreateRequest dto,
                                                       User requester, User registrant,
                                                       User salesRep, User supportManager) {
        return CustomerSupportRequest.builder()
                .customerCompanyCode(dto.getCustomerCompanyCode())
                .requestStartDate(dto.getRequestStartDate())
                .requestEndDate(dto.getRequestEndDate())
                .requestContent(dto.getRequestContent())
                .requester(requester)
                .registrant(registrant)
                .salesRep(salesRep)
                .supportManager(supportManager)
                .remarks(dto.getRemarks())
                .build();
    }

    private void mapAttachedFiles(CustomerSupportRequest request, List<Long> fileIds) {
        if (fileIds == null || fileIds.isEmpty()) {
            return;
        }
        List<UploadFile> files = uploadFileRepository.findAllById(fileIds);
        files.forEach(request::addAttachedFile);
    }

    private User getUserOrNull(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }

    private void updateAttachedFiles(CustomerSupportRequest request, List<Long> fileIds) {
        request.clearAttachedFiles();
        if (fileIds != null && !fileIds.isEmpty()) {
            List<UploadFile> files = uploadFileRepository.findAllById(fileIds);
            files.forEach(request::addAttachedFile);
        }
    }
}
