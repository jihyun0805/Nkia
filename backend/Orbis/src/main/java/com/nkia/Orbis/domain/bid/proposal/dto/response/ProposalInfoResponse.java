package com.nkia.Orbis.domain.bid.proposal.dto.response;

import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalInfoResponse {

    // 고객사 코드
    private String customerCompanyCode;
    // 고객사명
    private String customerCompanyName;
    // 사업기회 코드
    private String projectOpportunityCode;
    // 사업기회명
    private String projectOpportunityName;
    // 제품군
    private ProductClass projectType;
    // 제안형태
    private ProposalType proposalType;
    // 제안서 마감일
    private LocalDateTime proposalDeadLine;
    // 요청일
    private LocalDateTime requestDate;
    // 영업대표
    private String requestUserName;

    public static ProposalInfoResponse of(SalesActivityRequest salesActivityRequest) {
        Company company = salesActivityRequest.getCompany();

        // 1. SalesActivity 및 ProjectOpportunity Null 방어
        ProjectOpportunity projectOpportunity = null;
        if (salesActivityRequest.getSalesActivity() != null) {
            projectOpportunity = salesActivityRequest.getSalesActivity().getProjectOpportunity();
        }

        // 2. RFP 분석 결과 Null 방어 로직 추가
        ProposalType pType = null;
        LocalDateTime pDeadline = null;
        if (projectOpportunity != null && projectOpportunity.getRfpAnalyzeResult() != null) {
            pType = projectOpportunity.getRfpAnalyzeResult().getProposalType();
            pDeadline = projectOpportunity.getRfpAnalyzeResult().getProposalDeadline();
        }

        return ProposalInfoResponse.builder()
                .customerCompanyCode(company != null ? company.getCode() : null)
                .customerCompanyName(company != null ? company.getName() : null)
                .projectOpportunityCode(projectOpportunity != null ? projectOpportunity.getOpportunityCode() : null)
                .projectOpportunityName(projectOpportunity != null ? projectOpportunity.getOpportunityName() : null)
                .projectType(projectOpportunity != null ? projectOpportunity.getProjectType() : null)
                .proposalType(pType)
                .proposalDeadLine(pDeadline)
                .requestDate(salesActivityRequest.getCreatedAt())
                .requestUserName(
                        salesActivityRequest.getRequestUser() != null ? salesActivityRequest.getRequestUser().getName()
                                : "알 수 없음")
                .build();
    }

}
