package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.repository.MaintenanceQuotationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MaintenanceQuotationHandler implements WorkflowDomainHandler {

    private final MaintenanceQuotationRepository maintenanceQuotationRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.MAINTENANCE_QUOTATION;
    }

    @Override
    public void onApproved(Long targetId) {
        MaintenanceQuotation maintenanceQuotation = maintenanceQuotationRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.QUOTATION_NOT_FOUND));

        maintenanceQuotation.approve();
    }

    @Override
    public void onRejected(Long targetId) {
        MaintenanceQuotation maintenanceQuotation = maintenanceQuotationRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.QUOTATION_NOT_FOUND));

        maintenanceQuotation.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        MaintenanceQuotation maintenanceQuotation = maintenanceQuotationRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.QUOTATION_NOT_FOUND));

        maintenanceQuotation.cancel();
    }
}
