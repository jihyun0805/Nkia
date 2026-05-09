package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpStatus;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record RfpAnalyzeResultDetailResponse(
    Long id,
    String projectName,
    String hardwareProvider,
    BigDecimal budgetAmount,
    String expectedDuration,
    String projectLocation,
    LocalDateTime proposalDeadline,
    String projectDescription,
    RfpStatus status,
    ProposalType proposalType,

    UUID assigneeId,
    String assigneeName,

    // 2. 사업 기회(ProjectOpportunity) 연관 정보 평탄화
    Long projectOpportunityId,
    String customerCompanyName,
    ProductClass projectType,
    List<String> productModules, // 모듈 이름만 추출한 리스트
    UUID salesRepresentativeId,
    String salesRepresentativeName,

    List<RfpRequirementResponse> requirements
) {
  public static RfpAnalyzeResultDetailResponse from(RfpAnalyzeResult entity) {
    ProjectOpportunity projectOpportunity = entity.getProjectOpportunity();

    return new RfpAnalyzeResultDetailResponse(
        entity.getId(),
        entity.getProjectName(),
        entity.getHardwareProvider(),
        entity.getBudgetAmount(),
        entity.getExpectedDuration(),
        entity.getProjectLocation(),
        entity.getProposalDeadline(),
        entity.getProjectDescription(),
        entity.getStatus(),
        entity.getProposalType(),

        // 담당자 Null Safe 매핑
        entity.getAssignee() != null ? entity.getAssignee().getId() : null,
        entity.getAssignee() != null ? entity.getAssignee().getName() : null,

        // 사업 기회 연관 정보 Null Safe 매핑
        projectOpportunity != null ? projectOpportunity.getId() : null,
        (projectOpportunity != null && projectOpportunity.getCustomerCompany() != null) ? projectOpportunity.getCustomerCompany().getName() : null,
        projectOpportunity != null ? projectOpportunity.getProjectType() : null,

        // ProductModule 연관 객체에서 이름(또는 코드)만 추출하여 List<String>으로 변환
        (projectOpportunity != null && projectOpportunity.getProductModules() != null)
            ? projectOpportunity.getProductModules().stream()
            .map(moduleRel -> moduleRel.getProductModule().getProductName())
            .toList()
            : Collections.emptyList(),

        (projectOpportunity != null && projectOpportunity.getSalesRepresentative() != null) ? projectOpportunity.getSalesRepresentative().getId() : null,
        (projectOpportunity != null && projectOpportunity.getSalesRepresentative() != null) ? projectOpportunity.getSalesRepresentative().getName() : null,

        entity.getRequirements().stream()
            .map(RfpRequirementResponse::from)
            .toList()
    );
  }
}
