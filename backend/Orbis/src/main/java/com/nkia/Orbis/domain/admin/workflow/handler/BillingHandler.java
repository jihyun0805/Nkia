package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.billing.repository.BillingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BillingHandler implements WorkflowDomainHandler {

    private final BillingRepository billingRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.BILLING;
    }

    @Override
    public void onApproved(Long targetId) {
        Billing billing = billingRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        billing.approve();
    }

    @Override
    public void onRejected(Long targetId) {
        Billing billing = billingRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        billing.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        Billing billing = billingRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        billing.cancel();
    }
}
