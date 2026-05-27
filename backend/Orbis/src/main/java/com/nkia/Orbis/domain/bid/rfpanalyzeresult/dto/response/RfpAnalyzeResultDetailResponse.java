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
        // 상태
        RfpStatus status,
        // 주요 사업 내용
        String projectDescription,

        // 담당자 id, 이름
        UUID assigneeId, String assigneeName,

        // 요청자 id, 이름
        String requestUserId, String requestUserName,

        // 요청일
        LocalDateTime requestDate,

        // 2. 사업 기회(ProjectOpportunity) 연관 정보 평탄화
        Long projectOpportunityId,
        // 사업 기회 이름
        String projectOpportunityName,
        // 고객사 이름
        String customerCompanyName,
        // 사업 구분
        ProductClass projectType,
        // 납품 모듈
        List<String> productModules, // 모듈 이름만 추출한 리스트

        // 요구사항 응답
        List<RfpRequirementResponse> requirements) {
    public static RfpAnalyzeResultDetailResponse from(RfpAnalyzeResult entity) {
        ProjectOpportunity opp = entity.getProjectOpportunity();

        return new RfpAnalyzeResultDetailResponse(entity.getId(), entity.getProposalType(),
                entity.getHardwareProvider(), entity.getBudgetAmount(), entity.getExpectedDuration(),
                entity.getProjectLocation(), entity.getProposalDeadline(), entity.getStatus(),
                entity.getProjectDescription(),

                // 담당자 매핑
                getAssigneeId(entity), getAssigneeName(entity),

                // 요청자 관련
                entity.getCreatedBy(), entity.getRequestUserName(),

                // 요청일 관련
                entity.getCreatedAt(),

                // 사업 기회 연관 정보 매핑
                getProjectOpportunityId(opp), getProjectOpportunityName(opp),
                getCustomerCompanyName(opp), getProjectType(opp),
                getProductModules(opp),

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

    private static String getProjectOpportunityName(ProjectOpportunity opp) {
        return opp != null ? opp.getOpportunityName() : null;
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

    private static List<RfpRequirementResponse> getRequirements(RfpAnalyzeResult entity) {
        return entity.getRequirements().stream().map(RfpRequirementResponse::from).toList();
    }
}
