package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request;

import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ProjectOpportunityCreateRequest(
        @NotBlank(message = "사업기회 코드는 필수입니다.")
        String opportunityCode,

        @NotBlank(message = "사업기회명은 필수입니다.")
        String opportunityName,

        @NotNull(message = "사업 구분은 필수입니다.")
        ProductClass projectType,

        LocalDate expectedBidDate,
        BigDecimal expectedBudget,
        String description,
        String competitionStatus,

        @NotNull(message = "고객사 ID는 필수입니다.")
        Long customerCompanyId
) {
    public ProjectOpportunity toEntity(Company customerCompany) {
        return ProjectOpportunity.builder()
                .opportunityCode(this.opportunityCode())
                .opportunityName(this.opportunityName())
                .projectType(this.projectType())
                .expectedBidDate(this.expectedBidDate())
                .expectedBudget(this.expectedBudget())
                .description(this.description())
                .competitionStatus(this.competitionStatus())
                // 상태는 기본값(FINDING)이 들어가도록 엔티티 빌더에 처리되어 있음
                .customerCompany(customerCompany) // Service에서 조회해온 객체 주입!
                .build();
    }
}