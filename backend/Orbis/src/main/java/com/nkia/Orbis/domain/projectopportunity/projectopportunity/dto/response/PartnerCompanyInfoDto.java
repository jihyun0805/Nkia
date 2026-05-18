package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.response;

import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityPartnerCompany;

public record PartnerCompanyInfoDto(
        Long id,
        String name
) {
    public static PartnerCompanyInfoDto from(ProjectOpportunityPartnerCompany entity) {
        return new PartnerCompanyInfoDto(
                entity.getCompany().getId(),
                entity.getCompany().getName()
        );
    }
}
