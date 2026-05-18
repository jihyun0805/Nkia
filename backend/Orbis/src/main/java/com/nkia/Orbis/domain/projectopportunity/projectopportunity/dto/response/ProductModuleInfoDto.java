package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.response;

import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityProductModule;

public record ProductModuleInfoDto(
        Long id,
        String productName
) {
    public static ProductModuleInfoDto from(ProjectOpportunityProductModule entity) {
        return new ProductModuleInfoDto(
                entity.getProductModule().getId(),
                entity.getProductModule().getProductName()
        );
    }
}
