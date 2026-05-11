package com.nkia.Orbis.domain.project.billing.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCollectRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCreateRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingIssueRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingUpdateRequest;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingDetailResponse;
import com.nkia.Orbis.domain.project.billing.dto.response.BillingListResponse;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.billing.entity.BillingStatus;
import com.nkia.Orbis.domain.project.billing.repository.BillingRepository;
import com.nkia.Orbis.domain.uploadfile.service.UploadFileService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BillingService {
    private final BillingRepository billingRepository;
    private final OrderReportRepository orderReportRepository;
    private final UploadFileService uploadFileService;

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

        return BillingDetailResponse.from(billing);
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
    @Transactional(readOnly = true)
    public List<BillingListResponse> getBillingList() {
        List<Billing> billings = billingRepository.findAllByOrderByIdDesc();

        return billings.stream()
                .map(BillingListResponse::from)
                .toList();
    }

    /**
     * 특정 청구 건의 상세 정보 조회
     */
    @Transactional(readOnly = true)
    public BillingDetailResponse getBillingDetail(Long billingId) {
        Billing billing = billingRepository.findById(billingId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        return BillingDetailResponse.from(billing);
    }
}
