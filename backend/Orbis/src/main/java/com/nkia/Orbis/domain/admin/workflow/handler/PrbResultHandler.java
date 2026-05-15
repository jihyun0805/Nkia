package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.PrbResultErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import com.nkia.Orbis.domain.bid.prbresult.repository.PrbResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PrbResultHandler implements WorkflowDomainHandler {

    private final PrbResultRepository prbResultRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.PRB_RESULT;
    }

    @Override
    public void onApproved(Long targetId) {
        PrbResult prbResult = prbResultRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(PrbResultErrorCode.PRB_RESULT_NOT_FOUND));

        prbResult.approve();
        prbResult.issued();
    }

    @Override
    public void onRejected(Long targetId) {
        PrbResult prbResult = prbResultRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(PrbResultErrorCode.PRB_RESULT_NOT_FOUND));

        prbResult.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        PrbResult prbResult = prbResultRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(PrbResultErrorCode.PRB_RESULT_NOT_FOUND));

        prbResult.cancel();
    }
}
