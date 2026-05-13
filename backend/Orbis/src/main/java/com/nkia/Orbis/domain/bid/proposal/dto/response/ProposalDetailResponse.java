package com.nkia.Orbis.domain.bid.proposal.dto.response;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.proposal.entity.Proposal;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import java.time.LocalDateTime;
import java.util.List;

public record ProposalDetailResponse(
        Long proposalId,

        // --- SalesActivityRequest 정보 ---
        Long salesActivityRequestId,
        LocalDateTime requestDate,
        String requestUserName,

        // --- Company 정보 ---
        String customerCompanyCode,
        String customerCompanyName,

        // --- ProjectOpportunity 정보 ---
        String opportunityCode,
        String opportunityName,
        ProductClass projectType,

        // --- RfpAnalyzeResult 정보 ---
        LocalDateTime proposalDeadline,
        ProposalType proposalType,

        // --- Proposal 자체 정보 ---
        String createdByName, // BaseEntity의 createdBy(UUID)로 찾은 User의 이름
        String status,

        // --- 파일 정보 ---
        List<ProposalFileResponse> files
) {
    public static ProposalDetailResponse of(Proposal proposal, User creator, List<ProposalFileResponse> files) {
        var opportunity = proposal.getProjectOpportunity();
        var company = opportunity.getCustomerCompany();
        var rfp = opportunity.getRfpAnalyzeResult();
        var request = proposal.getSalesActivityRequest();

        return new ProposalDetailResponse(
                proposal.getId(),

                request != null ? request.getId() : null,
                request != null ? request.getCreatedAt() : null,
                (request != null && request.getRequestUser() != null) ? request.getRequestUser().getName() : null,

                company.getCode(),
                company.getName(),

                opportunity.getOpportunityCode(),
                opportunity.getOpportunityName(),
                opportunity.getProjectType(),

                rfp != null ? rfp.getProposalDeadline() : null,
                rfp != null ? rfp.getProposalType() : null,

                creator != null ? creator.getName() : "알 수 없음", // 탈퇴한 사용자 등 방어 로직
                proposal.getStatus().getDescription(),

                files
        );
    }
}