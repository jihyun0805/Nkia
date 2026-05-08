package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.response;


import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityStage;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ProjectOpportunityResponse(
        Long id,
        String opportunityCode,
        String opportunityName,
        ProjectOpportunityStage stage,
        ProductClass projectType,
        LocalDate expectedBidDate,
        BigDecimal expectedBudget,
        String customerCompanyName, // 객체 전체가 아닌 화면에 필요한 이름만 평탄화
        String description
) {
    // Entity -> DTO 변환을 위한 정적 팩토리 메서드
    public static ProjectOpportunityResponse from(ProjectOpportunity entity) {
        return new ProjectOpportunityResponse(
                entity.getId(),
                entity.getOpportunityCode(),
                entity.getOpportunityName(),
                entity.getStage(),
                entity.getProjectType(),
                entity.getExpectedBidDate(),
                entity.getExpectedBudget(),
                // 지연 로딩된 고객사 객체가 null일 수 있으므로 null safe 처리
                entity.getCustomerCompany() != null ? entity.getCustomerCompany().getName() : null,
                entity.getDescription()
        );
    }
}