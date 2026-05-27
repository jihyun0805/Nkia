package com.nkia.Orbis.domain.bid.proposal.dto.response;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.bid.proposal.entity.Proposal;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import java.time.LocalDateTime;

public record ProposalListResponse(
        Long proposalId,
        LocalDateTime requestDate,         // SalesActivityRequest createdAt
        String customerCompanyName,        // ProjectOpportunity -> Company name
        String opportunityName,            // ProjectOpportunity name
        ProductClass projectType,          // ProjectOpportunity projectType
        LocalDateTime proposalDeadline,    // RfpAnalyzeResult proposalDeadline
        ProposalType proposalType,         // RfpAnalyzeResult proposalType
        String status                      // Proposal status (한글 설명)
) {
    public static ProposalListResponse from(Proposal proposal) {
        var opportunity = proposal.getProjectOpportunity();
        var rfp = opportunity.getRfpAnalyzeResult();
        var request = proposal.getSalesActivityRequest();

        return new ProposalListResponse(
                proposal.getId(),

                // Null-safe 처리: 타 부서 요청이 없을 수도 있으므로 방어 로직 추가
                request != null ? request.getCreatedAt() : null,

                // opportunity와 company는 필수값이므로 바로 접근
                opportunity.getCustomerCompany().getName(),
                opportunity.getOpportunityName(),
                opportunity.getProjectType(),

                // RFP 분석을 거치지 않은 사업 기회일 수 있으므로 Null-safe 처리
                rfp != null ? rfp.getProposalDeadline() : null,
                rfp != null ? rfp.getProposalType() : null,

                // Enum의 프론트엔드 노출용 한글 description 반환 ("작성중", "완료")
                proposal.getStatus().getDescription()
        );
    }
}