package com.nkia.Orbis.domain.bid.bidresult.dto.response;

import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.bid.proposal.entity.Proposal;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityProductModule;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BidResultInfoResponse {
    private String customerCompanyCode;
    private String customerCompanyName;
    private String projectOpportunityCode;
    private String projectOpportunityName;
    private List<String> productModulesName;
    private LocalDateTime proposalDeadLine;
    private LocalDateTime proposalPresentationDate;
    private String proposalCreateUserName;

    public static BidResultInfoResponse of(Proposal proposal, String proposalCreateUserName) {
        ProjectOpportunity projectOpportunity = proposal.getProjectOpportunity();
        Prb prb = projectOpportunity.getPrb();
        Company company = projectOpportunity.getCustomerCompany();

        // 1. Stream을 활용한 모듈명 추출 로직 적용
        List<String> productModulesName = getProductModulesName(projectOpportunity.getProductModules());

        // 2. PRB 정보가 없을 수 있는(Null) 상황에 대한 방어 로직
        LocalDateTime deadLine = null;
        LocalDateTime presentationDate = null;
        if (prb != null && prb.getProjectInfo() != null) {
            deadLine = prb.getProjectInfo().getProposalDeadlineDatetime();
            presentationDate = prb.getProjectInfo().getProposalPresentationDatetime();
        }

        return BidResultInfoResponse.builder()
                .customerCompanyCode(company != null ? company.getCode() : null)
                .customerCompanyName(company != null ? company.getName() : null)
                .projectOpportunityCode(projectOpportunity.getOpportunityCode())
                .projectOpportunityName(projectOpportunity.getOpportunityName())
                .productModulesName(productModulesName)
                .proposalDeadLine(deadLine)
                .proposalPresentationDate(presentationDate)
                .proposalCreateUserName(proposalCreateUserName)
                .build();
    }

    private static List<String> getProductModulesName(List<ProjectOpportunityProductModule> productModules) {
        if (productModules == null || productModules.isEmpty()) {
            return Collections.emptyList();
        }
        return productModules.stream()
                .map(mapping -> mapping.getProductModule().getProductName()) // 엔티티에서 이름만 추출
                .collect(Collectors.toList()); // List<String>으로 변환
    }
}
