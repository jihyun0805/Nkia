package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityStage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProjectOpportunityCreateRequest(
        @NotBlank(message = "사업기회 코드는 필수입니다.")
        String opportunityCode,

        @NotBlank(message = "사업기회명은 필수입니다.")
        String opportunityName,

        @NotNull(message = "진행 상태(Stage)는 필수입니다.")
        ProjectOpportunityStage stage,

        @NotNull(message = "사업 구분은 필수입니다.")
        ProductClass projectType,

        @NotNull(message = "영업 대표 ID는 필수입니다.")
        UUID salesRepresentativeId,

        LocalDate expectedBidDate,
        BigDecimal expectedBudget,
        String description,
        String competitionStatus,

        @NotNull(message = "고객사 ID는 필수입니다.")
        Long customerCompanyId,

        List<Long> partnerCompanyIds, // 추가: 협력사 ID 리스트
        List<Long> productModuleIds,  // 추가: 납품 모듈 ID 리스트
        List<Long> rfpFileIds         // 추가: 첨부파일 ID 리스트
) {
    public ProjectOpportunity toEntity(Company customerCompany, User salesRepresentative) {
        return ProjectOpportunity.builder()
                .opportunityCode(this.opportunityCode())
                .opportunityName(this.opportunityName())
                .stage(this.stage()) // Enum 값 주입
                .projectType(this.projectType())
                .expectedBidDate(this.expectedBidDate())
                .expectedBudget(this.expectedBudget())
                .description(this.description())
                .competitionStatus(this.competitionStatus())
                .salesRepresentative(salesRepresentative)
                .customerCompany(customerCompany)
                .build();
    }
}
