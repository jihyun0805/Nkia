package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RfpAnalyzeResultUpdateRequest(
    @NotBlank(message = "프로젝트명은 필수입니다.")
    String projectName,

    String hardwareProvider,
    BigDecimal budgetAmount,
    String expectedDuration,
    String projectLocation,
    LocalDateTime proposalDeadline,
    String projectDescription,

    List<RfpRequirementRequest> requirements
) {}
