package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request;

import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RfpAnalyzeResultUpdateRequest(
    @NotBlank(message = "프로젝트명은 필수입니다.")
    String projectName,

    String hardwareProvider,
    BigDecimal budgetAmount,
    String expectedDuration,
    String projectLocation,
    LocalDateTime proposalDeadline,
    String projectDescription,
    ProposalType proposalType,

    @NotNull(message = "담당자 ID는 필수입니다.")
    UUID assigneeId,

    List<RfpRequirementRequest> requirements
) {}
