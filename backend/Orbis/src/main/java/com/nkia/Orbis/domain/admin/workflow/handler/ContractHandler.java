package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import com.nkia.Orbis.domain.contract.contractsummary.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ContractHandler implements WorkflowDomainHandler {

    private final ContractRepository contractRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.CONTRACT;
    }

    @Override
    public void onApproved(Long targetId) {
        Contract contract = contractRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.CONTRACT_SUMMARY_NOT_FOUND));

        contract.approve();
    }

    @Override
    public void onRejected(Long targetId) {
        Contract contract = contractRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.CONTRACT_SUMMARY_NOT_FOUND));

        contract.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        Contract contract = contractRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.CONTRACT_SUMMARY_NOT_FOUND));

        contract.cancel();
    }
}
