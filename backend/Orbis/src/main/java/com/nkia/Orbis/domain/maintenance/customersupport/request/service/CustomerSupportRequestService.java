package com.nkia.Orbis.domain.maintenance.customersupport.request.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CompanyErrorCode;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowRepository;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.repository.CompanyRepository;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestUpdateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response.CustomerSupportRequestDetailResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response.CustomerSupportRequestListResponse;
import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.repository.CustomerSupportRequestRepository;
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
public class CustomerSupportRequestService {

    private final CustomerSupportRequestRepository requestRepository;
    private final UploadFileRepository uploadFileRepository;
    private final UserRepository userRepository;
    private final UploadFileService uploadFileService;
    private final CompanyRepository companyRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowService workflowService;

    /**
     * 고객지원 요청 등록
     */
    @Transactional
    public Long createRequest(CustomerSupportRequestCreateRequest requestDto) {
        User requester = getUserOrNull(requestDto.getRequesterId());
        User registrant = getUserOrNull(requestDto.getRegistrantId());
        User salesRep = getUserOrNull(requestDto.getSalesRepId());
        User supportManager = getUserOrNull(requestDto.getSupportManagerId());
        Company customerCompany = getCompanyOrNull(requestDto.getCustomerCompanyCode());

        CustomerSupportRequest request = createRequestEntity(requestDto, requester, registrant, salesRep,
                supportManager, customerCompany);

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
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));

        User requester = userRepository.findById(dto.getRequesterId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
        User supportManager = getUserOrNull(dto.getSupportManagerId());
        Company customerCompany = getCompanyOrNull(dto.getCustomerCompanyCode());

        request.update(dto, requester, supportManager, customerCompany);
        updateAttachedFiles(request, dto.getAttachedFileIds());

        return CustomerSupportRequestDetailResponse.from(request, getWorkflowId(request.getId()));
    }

    /**
     * 요청 및 연관된 모든 첨부파일을 삭제
     */
    @Transactional
    public void deleteRequest(Long id) {
        CustomerSupportRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));

        request.getAttachedFiles().forEach(file -> uploadFileService.removeFile(file.getId()));

        request.delete();
    }

    /**
     * 고객지원 요청 목록을 조회
     */
    public List<CustomerSupportRequestListResponse> getRequests() {
        List<CustomerSupportRequest> requests = requestRepository.findAllByOrderByIdDesc();

        return requests.stream()
                .map(CustomerSupportRequestListResponse::from)
                .toList();
    }

    /**
     * 특정 고객지원 요청의 상세 정보 조회
     */
    public CustomerSupportRequestDetailResponse getRequestDetail(Long id) {
        CustomerSupportRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));

        return CustomerSupportRequestDetailResponse.from(request, getWorkflowId(request.getId()));
    }

    private CustomerSupportRequest createRequestEntity(CustomerSupportRequestCreateRequest dto,
                                                       User requester, User registrant,
                                                       User salesRep, User supportManager,
                                                       Company customerCompany) {
        return CustomerSupportRequest.builder()
                .customerCompany(customerCompany)
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

    private Company getCompanyOrNull(Long companyId) {
        if (companyId == null) {
            return null;
        }
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));
    }

    @Transactional
    public void submitCustomerSupportRequest(
            Long customerSupportRequestId,
            UUID firstApproverId
    ) {
        CustomerSupportRequest customerSupportRequest = requestRepository.findById(customerSupportRequestId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));
        if (!customerSupportRequest.isDraft()) {
            throw new ApiException(MaintenanceErrorCode.INVALID_CS_REQUEST_STATUS);
        }

        UUID requesterId = UUID.fromString(SecurityUtil.getCurrentUserId());

        Workflow workflow = workflowService.startWorkflow(
                WorkflowDomain.CUSTOMER_SUPPORT,
                customerSupportRequest.getId(),
                requesterId,
                firstApproverId
        );

        customerSupportRequest.submit();
    }

    private Long getWorkflowId(Long customerSupportRequestId) {

        return workflowRepository
                .findByWorkflowDomainAndTargetIdAndStatus(
                        WorkflowDomain.CUSTOMER_SUPPORT,
                        customerSupportRequestId,
                        WorkflowStatus.IN_PROGRESS
                )
                .map(Workflow::getId)
                .orElse(null);
    }
}
