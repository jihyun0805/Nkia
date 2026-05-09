package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RfpAnalyzeResultCreateRequest(@NotBlank(message = "프로젝트명은 필수입니다.") String projectName,
    String hardwareProvider, BigDecimal budgetAmount, String expectedDuration,
    String projectLocation, LocalDateTime proposalDeadline, String projectDescription,
    ProposalType proposalType,

    @NotNull(message = "담당자 ID는 필수입니다.") UUID assigneeId,

    @NotNull(message = "영업 기회 ID는 필수입니다.") Long projectOpportunityId,

    List<RfpRequirementRequest> requirements) {
  public RfpAnalyzeResult toEntity(User assignee, ProjectOpportunity projectOpportunity) {
    return RfpAnalyzeResult.builder()
        .projectName(this.projectName())
        .hardwareProvider(this.hardwareProvider())
        .budgetAmount(this.budgetAmount())
        .expectedDuration(this.expectedDuration())
        .projectLocation(this.projectLocation())
        .proposalDeadline(this.proposalDeadline())
        .projectDescription(this.projectDescription())
        .proposalType(this.proposalType())
        .assignee(assignee)
        .projectOpportunity(projectOpportunity)
        .build();
  }
}
