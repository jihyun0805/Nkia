package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.PrbErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.bid.prb.repository.PrbRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PrbHandler implements WorkflowDomainHandler {

    private final PrbRepository prbRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.PRB;
    }

    @Override
    public void onApproved(Long targetId) {
        Prb prb = prbRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(PrbErrorCode.PRB_NOT_FOUND));

        prb.approve();
    }

    @Override
    public void onRejected(Long targetId) {
        Prb prb = prbRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(PrbErrorCode.PRB_NOT_FOUND));

        prb.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        Prb prb = prbRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(PrbErrorCode.PRB_NOT_FOUND));

        prb.cancel();
    }
}
