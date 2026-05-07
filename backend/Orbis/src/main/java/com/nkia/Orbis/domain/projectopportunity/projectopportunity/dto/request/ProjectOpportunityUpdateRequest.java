package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request;

import com.nkia.Orbis.domain.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityStage;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ProjectOpportunityUpdateRequest(
        @NotBlank(message = "사업기회명은 필수입니다.")
        String opportunityName,

        ProjectOpportunityStage stage, // 영업 상태(발굴, 입찰 등) 변경 가능
        ProductClass projectType,

        LocalDate expectedBidDate,
        LocalDate expectedContractDate,
        BigDecimal expectedBudget,

        String description,
        String issueNote,
        String competitionStatus
) {
}