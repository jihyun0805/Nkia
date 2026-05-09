package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response;

import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
    Long projectOpportunityId,
    List<RfpRequirementResponse> requirements,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
  public static RfpAnalyzeResultDetailResponse from(RfpAnalyzeResult entity) {
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
        entity.getProjectOpportunity() != null ? entity.getProjectOpportunity().getId() : null,
        entity.getRequirements().stream()
            .map(RfpRequirementResponse::from)
            .toList(),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }
}
