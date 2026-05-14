package com.nkia.Orbis.domain.project.billing.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowRepository;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import com.nkia.Orbis.domain.alarm.entity.AlarmType;
import com.nkia.Orbis.domain.alarm.event.AlarmEvent;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCollectRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCreateRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingIssueRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingUpdateRequest;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingDetailResponse;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingFormInitResponse;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingListResponse;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.billing.entity.BillingStatus;
import com.nkia.Orbis.domain.project.billing.repository.BillingRepository;
import com.nkia.Orbis.domain.uploadfile.service.UploadFileService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BillingService {
    private final BillingRepository billingRepository;
    private final OrderReportRepository orderReportRepository;
    private final UploadFileService uploadFileService;
    private final UserRepository userRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowService workflowService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 청구(세금계산서 발행) 등록
     */
    @Transactional
    public Long registerBilling(BillingCreateRequest request) {
        OrderReport orderReport = orderReportRepository.findById(request.getOrderReportId())
                .orElseThrow(() -> new ApiException(ContractErrorCode.ORDER_REPORT_NOT_FOUND));

        Billing billing = Billing.builder()
                .orderReport(orderReport)
                .billingAmount(request.getBillingAmount())
                .requestedIssueDate(request.getRequestedIssueDate())
                .remarks(request.getRemarks())
                .status(BillingStatus.REQUESTED)
                .build();

        Billing savedBilling = billingRepository.save(billing);

        return savedBilling.getId();
    }

    /**
     * 세금계산서 발행 확인
     */
    @Transactional
    public void issueBilling(Long billingId, BillingIssueRequest request) {
        Billing billing = billingRepository.findById(billingId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        if (billing.getStatus() == BillingStatus.ISSUED || billing.getStatus() == BillingStatus.COLLECTED) {
            throw new ApiException(ProjectErrorCode.BILLING_ALREADY_ISSUED);
        }

        if (billing.getStatus() != BillingStatus.APPROVED) {
            throw new ApiException(ProjectErrorCode.BILLING_NOT_APPROVED);
        }

        billing.issue(request.getIssuedAt(), request.getInvoiceImageId());

        // 수금 담당자에게 알림 발송 (임시: admin 유저)
        User sender = userRepository.findById(UUID.fromString(SecurityUtil.getCurrentUserId()))
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
        User receiver = userRepository.findByEmail("admin@admin.com")
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        eventPublisher.publishEvent(new AlarmEvent(
                sender,
                receiver,
                AlarmType.BILLING_COLLECTION_REQUEST,
                "세금계산서가 발행되었습니다. 수금 결과를 확정하시겠습니까?",
                billingId
        ));
    }

    /**
     * 수금 확인
     */
    @Transactional
    public void collectBilling(Long billingId, BillingCollectRequest request) {
        Billing billing = billingRepository.findById(billingId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        if (billing.getStatus() == BillingStatus.COLLECTED) {
            throw new ApiException(ProjectErrorCode.BILLING_ALREADY_COLLECTED);
        }

        if (billing.getStatus() != BillingStatus.ISSUED) {
            throw new ApiException(ProjectErrorCode.COLLECTION_NOT_APPROVED);
        }

        billing.collect(request.getCollectedAt());
    }

    /**
     * 수주보고서 ID와 현재 사용자 ID(혹은 이름)를 기반으로 폼 초기화 정보를 생성
     */
    public BillingFormInitResponse getBillingInitData(Long orderReportId, String userIdStr) {
        OrderReport report = orderReportRepository.findById(orderReportId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.ORDER_REPORT_NOT_FOUND));

        String userName = userIdStr;

        try {
            UUID userUuid = UUID.fromString(userIdStr);
            User user = userRepository.findById(userUuid).orElse(null);
            if (user != null) {
                userName = user.getName();
            }
        } catch (IllegalArgumentException e) {
            // 예외 무시
        }

        return convertToFormInitResponse(report, userName);
    }

    /**
     * 엔티티 정보를 바탕으로 BillingFormInitResponse를 조립
     */
    private BillingFormInitResponse convertToFormInitResponse(OrderReport report, String userName) {
        Long contractId = (report.getContract() != null) ? report.getContract().getId() : null;

        return new BillingFormInitResponse(
                report.getFinalCustomerCompany().getName(),
                report.getProjectOpportunity().getOpportunityName(),
                userName,
                LocalDate.now(),
                contractId);
    }

    /**
     * 청구 정보 수정 처리
     */
    @Transactional
    public BillingDetailResponse updateBilling(Long billingId, BillingUpdateRequest request) {
        Billing billing = billingRepository.findById(billingId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        Long oldImageId = null;
        if (billing.getStatus() == BillingStatus.ISSUED && billing.getInvoiceImageId() != null
                && !billing.getInvoiceImageId().equals(request.getInvoiceImageId())) {
            oldImageId = billing.getInvoiceImageId();
        }

        billing.updateByStatus(request);

        if (oldImageId != null) {
            uploadFileService.getUploadFile(oldImageId).delete();
        }

        return BillingDetailResponse.from(billing, getWorkflowId(billing.getId()));
    }

    /**
     * 청구 정보 및 연관된 첨부파일 삭제
     */
    @Transactional
    public void deleteBilling(Long billingId) {
        Billing billing = billingRepository.findById(billingId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        if (billing.getInvoiceImageId() != null) {
            uploadFileService.getUploadFile(billing.getInvoiceImageId()).delete();
        }

        billing.delete();
    }

    /**
     * 청구 및 수금 현황 목록을 최신순으로 조회
     */
    public List<BillingListResponse> getBillingList() {
        List<Billing> billings = billingRepository.findAllByOrderByIdDesc();

        return billings.stream()
                .map(BillingListResponse::from)
                .toList();
    }

    /**
     * 특정 청구 건의 상세 정보 조회
     */
    public BillingDetailResponse getBillingDetail(Long billingId) {
        Billing billing = billingRepository.findById(billingId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        return BillingDetailResponse.from(billing, getWorkflowId(billing.getId()));
    }

    @Transactional
    public void submitBilling(
            Long billingId,
            UUID firstApproverId
    ) {
        Billing billing = billingRepository.findById(billingId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        if (!billing.isDraft()) {
            throw new ApiException(ProjectErrorCode.INVALID_BILLING_STATUS);
        }

        UUID requesterId = UUID.fromString(SecurityUtil.getCurrentUserId());

        Workflow workflow = workflowService.startWorkflow(
                WorkflowDomain.BILLING,
                billing.getId(),
                requesterId,
                firstApproverId
        );

        billing.submit();
    }

    private Long getWorkflowId(Long billingId) {

        return workflowRepository
                .findByWorkflowDomainAndTargetIdAndStatus(
                        WorkflowDomain.BILLING,
                        billingId,
                        WorkflowStatus.IN_PROGRESS
                )
                .map(Workflow::getId)
                .orElse(null);
    }
}
