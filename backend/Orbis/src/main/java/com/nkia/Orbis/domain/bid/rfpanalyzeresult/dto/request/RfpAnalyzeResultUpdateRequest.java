package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request;

import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RfpAnalyzeResultUpdateRequest(
        // 제안 형태
        ProposalType proposalType,
        // HW 제공 주체
        String hardwareProvider,
        // 금액 규모
        BigDecimal budgetAmount,
        // 예상 사업 기간
        String expectedDuration,
        // 사업 장소
        String projectLocation,
        // 제안서 접수 마감일
        LocalDateTime proposalDeadline,
        // 주요 사업 내용
        String projectDescription,

        // 사업 기회 id
        Long projectOpportunityId,

        // 담당자 id
        UUID assigneeId,

        // 요구사항
        List<RfpRequirementRequest> requirements
) {
}
