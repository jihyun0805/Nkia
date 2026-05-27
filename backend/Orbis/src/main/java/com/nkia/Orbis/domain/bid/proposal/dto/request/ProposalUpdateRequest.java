package com.nkia.Orbis.domain.bid.proposal.dto.request;

import com.nkia.Orbis.domain.bid.proposal.entity.ProposalStatus;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProposalUpdateRequest(

        @NotNull(message = "사업 기회 ID는 필수입니다.")
        Long projectOpportunityId,

        Long salesActivityRequestId,
        
        ProposalStatus status,

        // 기존 파일을 유지하거나 삭제, 새로운 파일을 추가한 최종 파일 ID 목록
        List<Long> fileIds
) {
}