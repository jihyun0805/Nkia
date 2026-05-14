package com.nkia.Orbis.domain.bid.proposal.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProposalCreateRequest(

        @NotNull(message = "사업 기회 ID는 필수입니다.")
        Long projectOpportunityId,

        // 영업 활동 요청 ID (타 부서 지원 요청 없이 영업대표 단독 진행일 수 있으므로 Null 허용)
        Long salesActivityRequestId,

        // 프론트엔드에서 먼저 업로드 API를 호출한 뒤 반환받은 파일 ID 목록
        List<Long> fileIds
) {
}