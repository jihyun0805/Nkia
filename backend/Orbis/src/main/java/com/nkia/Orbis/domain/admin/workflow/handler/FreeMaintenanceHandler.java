package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FreeMaintenanceHandler implements WorkflowDomainHandler {

    private final MaintenanceRepository maintenanceRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.FREE_MAINTENANCE_CONTRACT;
    }

    @Override
    public void onApproved(Long targetId) {
        Maintenance maintenance = maintenanceRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        maintenance.approve();
    }

    @Override
    public void onRejected(Long targetId) {
        Maintenance maintenance = maintenanceRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        maintenance.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        Maintenance maintenance = maintenanceRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MAINTENANCE_NOT_FOUND));

        maintenance.cancel();
    }
}
