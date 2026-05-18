package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityStage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProjectOpportunityUpdateRequest(
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

        List<Long> partnerCompanyIds,
        List<Long> productModuleIds,
        List<Long> rfpFileIds
) {
}
