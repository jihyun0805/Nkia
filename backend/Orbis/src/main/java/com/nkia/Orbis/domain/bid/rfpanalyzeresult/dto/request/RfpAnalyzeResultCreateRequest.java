package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RfpAnalyzeResultCreateRequest(
    @NotBlank(message = "프로젝트명은 필수입니다.")
    String projectName,

    String hardwareProvider,
    BigDecimal budgetAmount,
    String expectedDuration,
    String projectLocation,
    LocalDateTime proposalDeadline,
    String projectDescription,

    @NotNull(message = "영업 기회 ID는 필수입니다.")
    Long projectOpportunityId,

    List<RfpRequirementRequest> requirements
) {}
