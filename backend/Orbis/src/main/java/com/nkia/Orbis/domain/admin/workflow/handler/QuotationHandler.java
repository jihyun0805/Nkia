package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ActivityErrorCode;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import com.nkia.Orbis.domain.activity.quotation.repository.QuotationRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class QuotationHandler implements WorkflowDomainHandler {

    private final QuotationRepository quotationRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.QUOTATION;
    }

    @Override
    public void onApproved(Long targetId) {
        Quotation quotation = quotationRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        quotation.approve();
    }

    @Override
    public void onRejected(Long targetId) {
        Quotation quotation = quotationRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        quotation.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        Quotation quotation = quotationRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        quotation.cancel();
    }
}
