package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.contract.license.entity.License;
import com.nkia.Orbis.domain.contract.license.repository.LicenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LicenseHandler implements WorkflowDomainHandler {

    private final LicenseRepository licenseRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.LICENSE;
    }

    @Override
    public void onApproved(Long targetId) {
        License license = licenseRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.LICENSE_NOT_FOUND));

        license.approve();
    }

    @Override
    public void onRejected(Long targetId) {
        License license = licenseRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.LICENSE_NOT_FOUND));

        license.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        License license = licenseRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.LICENSE_NOT_FOUND));

        license.cancel();
    }
}
