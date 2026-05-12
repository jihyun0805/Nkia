package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.repository.CustomerSupportRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CustomerSupportHandler implements WorkflowDomainHandler {

    private final CustomerSupportRequestRepository customerSupportRequestRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.CUSTOMER_SUPPORT;
    }

    @Override
    public void onApproved(Long targetId) {
        CustomerSupportRequest customerSupportRequest = customerSupportRequestRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));

        customerSupportRequest.approve();
        customerSupportRequest.approveCustomerSupportRequest();
    }

    @Override
    public void onRejected(Long targetId) {
        CustomerSupportRequest customerSupportRequest = customerSupportRequestRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));

        customerSupportRequest.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        CustomerSupportRequest customerSupportRequest = customerSupportRequestRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.SUPPORT_REQUEST_NOT_FOUND));

        customerSupportRequest.cancel();
    }
}
