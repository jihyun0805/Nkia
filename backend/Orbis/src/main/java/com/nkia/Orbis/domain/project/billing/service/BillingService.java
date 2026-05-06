package com.nkia.Orbis.domain.project.billing.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCollectRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingCreateRequest;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingIssueRequest;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.billing.entity.BillingStatus;
import com.nkia.Orbis.domain.project.billing.repository.BillingRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BillingService {
    private final BillingRepository billingRepository;
//    private final OrderReportRepository orderReportRepository;
    private final EntityManager em;

    /**
     * 청구(세금계산서 발행) 등록
     */
    @Transactional
    public Long registerBilling(BillingCreateRequest request) {
//        OrderReport orderReport = orderReportRepository.findById(request.getOrderReportId())
//                .orElseThrow(() -> new ApiException(/* 에러코드 */));

        OrderReport orderReport = em.getReference(OrderReport.class, request.getOrderReportId());

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

        if (billing.getStatus() != BillingStatus.ISSUED) {
            throw new ApiException(ProjectErrorCode.COLLECTION_NOT_APPROVED);
        }

        billing.collect(request.getCollectedAt());
    }
}
