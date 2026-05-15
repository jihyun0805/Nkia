package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.BidResultErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import com.nkia.Orbis.domain.bid.bidresult.repository.BidResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BidResultHandler implements WorkflowDomainHandler {

    private final BidResultRepository bidResultRepository;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.BID_RESULT;
    }

    @Override
    public void onApproved(Long targetId) {
        BidResult bidResult = bidResultRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(BidResultErrorCode.BID_RESULT_NOT_FOUND));

        bidResult.approve();
        bidResult.issued();
    }

    @Override
    public void onRejected(Long targetId) {
        BidResult bidResult = bidResultRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(BidResultErrorCode.BID_RESULT_NOT_FOUND));

        bidResult.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        BidResult bidResult = bidResultRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(BidResultErrorCode.BID_RESULT_NOT_FOUND));

        bidResult.cancel();
    }
}
