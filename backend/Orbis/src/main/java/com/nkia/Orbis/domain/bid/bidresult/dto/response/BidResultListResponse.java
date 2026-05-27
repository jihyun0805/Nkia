package com.nkia.Orbis.domain.bid.bidresult.dto.response;

import com.nkia.Orbis.domain.bid.bidresult.entity.BidOutcome;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BidResultListResponse {

    private Long id; // 목록에서 클릭 시 상세 조회로 넘어가기 위한 식별자

    // ProjectOpportunity
    private String opportunityName;

    // Customer Company
    private String customerCompanyName;

    // RFP
    private LocalDateTime proposalDeadline;
    private ProposalType proposalType;

    // BidResult & User
    private BidOutcome bidOutcome;
    private String salesRepresentativeName;

    /**
     * 리스트 조회를 위한 정적 팩토리 메서드
     */
    public static BidResultListResponse from(BidResult bidResult) {
        ProjectOpportunity po = bidResult.getProjectOpportunity();

        return BidResultListResponse.builder()
                .id(bidResult.getId())
                .opportunityName(po.getOpportunityName())
                .customerCompanyName(po.getCustomerCompany() != null ? po.getCustomerCompany().getName() : null)
                .proposalDeadline(
                        po.getRfpAnalyzeResult() != null ? po.getRfpAnalyzeResult().getProposalDeadline() : null)
                .proposalType(po.getRfpAnalyzeResult() != null ? po.getRfpAnalyzeResult().getProposalType() : null)
                .bidOutcome(bidResult.getBidOutcome())
                .salesRepresentativeName(
                        bidResult.getSalesRepresentative() != null ? bidResult.getSalesRepresentative().getName()
                                : null)
                .build();
    }
}