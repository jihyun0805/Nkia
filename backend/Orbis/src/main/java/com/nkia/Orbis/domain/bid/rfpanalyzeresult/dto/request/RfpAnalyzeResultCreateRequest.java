package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.ProposalType;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RfpAnalyzeResultCreateRequest(
        String projectName,
        // 제안 형태
        ProposalType proposalType,
        // HW 제공 주체
        String hardwareProvider,
        // 금액 규모
        BigDecimal budgetAmount,
        // 예상 사업 기간
        String expectedDuration,
        // 사업 장소
        String projectLocation,
        // 제안서 접수 마감일
        LocalDateTime proposalDeadline,
        // 주요 사업 내용
        String projectDescription,

        // 담당자
        @NotNull(message = "담당자 ID는 필수입니다.") UUID assigneeId,

        // 사업 기회
        @NotNull(message = "사업 기회 ID는 필수입니다.") Long projectOpportunityId,

        List<RfpRequirementRequest> requirements) {
    public RfpAnalyzeResult toEntity(String requestUserName, User assignee, ProjectOpportunity projectOpportunity) {
        String resolvedProjectName = this.projectName() != null && !this.projectName().isBlank()
                ? this.projectName()
                : projectOpportunity.getOpportunityName();

        return RfpAnalyzeResult.builder()
                .projectName(resolvedProjectName)
                .proposalType(this.proposalType())
                .hardwareProvider(this.hardwareProvider())
                .budgetAmount(this.budgetAmount())
                .expectedDuration(this.expectedDuration())
                .projectLocation(this.projectLocation())
                .proposalDeadline(this.proposalDeadline())
                .requestUserName(requestUserName)
                .projectDescription(this.projectDescription())
                .assignee(assignee)
                .projectOpportunity(projectOpportunity)
                .build();
    }
}
