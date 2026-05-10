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

public record RfpAnalyzeResultDetailResponse(Long id, String projectName, String hardwareProvider,
    BigDecimal budgetAmount, String expectedDuration, String projectLocation,
    LocalDateTime proposalDeadline, String projectDescription, RfpStatus status,
    ProposalType proposalType,

    UUID assigneeId, String assigneeName,

    // 2. 사업 기회(ProjectOpportunity) 연관 정보 평탄화
    Long projectOpportunityId, String customerCompanyName, ProductClass projectType,
    List<String> productModules, // 모듈 이름만 추출한 리스트
    UUID salesRepresentativeId, String salesRepresentativeName,

    List<RfpRequirementResponse> requirements) {
  public static RfpAnalyzeResultDetailResponse from(RfpAnalyzeResult entity) {
    ProjectOpportunity opp = entity.getProjectOpportunity();

    return new RfpAnalyzeResultDetailResponse(entity.getId(), entity.getProjectName(),
        entity.getHardwareProvider(), entity.getBudgetAmount(), entity.getExpectedDuration(),
        entity.getProjectLocation(), entity.getProposalDeadline(), entity.getProjectDescription(),
        entity.getStatus(), entity.getProposalType(),

        // 담당자 매핑
        getAssigneeId(entity), getAssigneeName(entity),

        // 사업 기회 연관 정보 매핑
        getProjectOpportunityId(opp), getCustomerCompanyName(opp), getProjectType(opp),
        getProductModules(opp), getSalesRepresentativeId(opp), getSalesRepresentativeName(opp),

        // 자식 컬렉션 매핑
        getRequirements(entity));
  }

  // =========================================================================
  // --- Private Helper Methods (Null-Safe 매핑 로직 은닉) ---
  // =========================================================================

  private static UUID getAssigneeId(RfpAnalyzeResult entity) {
    return entity.getAssignee() != null ? entity.getAssignee().getId() : null;
  }

  private static String getAssigneeName(RfpAnalyzeResult entity) {
    return entity.getAssignee() != null ? entity.getAssignee().getName() : null;
  }

  private static Long getProjectOpportunityId(ProjectOpportunity opp) {
    return opp != null ? opp.getId() : null;
  }

  private static String getCustomerCompanyName(ProjectOpportunity opp) {
    return (opp != null && opp.getCustomerCompany() != null)
        ? opp.getCustomerCompany().getName()
        : null;
  }

  private static ProductClass getProjectType(ProjectOpportunity opp) {
    return opp != null ? opp.getProjectType() : null;
  }

  private static List<String> getProductModules(ProjectOpportunity opp) {
    return (opp != null && opp.getProductModules() != null) ? opp.getProductModules()
        .stream()
        .map(moduleRel -> moduleRel.getProductModule().getProductName())
        .toList() : Collections.emptyList();
  }

  private static UUID getSalesRepresentativeId(ProjectOpportunity opp) {
    return (opp != null && opp.getSalesRepresentative() != null) ? opp.getSalesRepresentative()
        .getId() : null;
  }

  private static String getSalesRepresentativeName(ProjectOpportunity opp) {
    return (opp != null && opp.getSalesRepresentative() != null) ? opp.getSalesRepresentative()
        .getName() : null;
  }

  private static List<RfpRequirementResponse> getRequirements(RfpAnalyzeResult entity) {
    return entity.getRequirements().stream().map(RfpRequirementResponse::from).toList();
  }
}
