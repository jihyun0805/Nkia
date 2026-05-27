package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.response;


import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityStage;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ProjectOpportunityResponse(
        Long id,
        String opportunityCode,
        String opportunityName,
        ProjectOpportunityStage stage,
        ProductClass projectType,
        LocalDate expectedBidDate,
        BigDecimal expectedBudget,
        Long customerCompanyId,
        String customerCompanyName,
        String salesRepresentativeId,
        String salesRepresentativeName,
        String createdBy,
        String createUserName,
        String description,
        String competitionStatus,

        List<PartnerCompanyInfoDto> partnerCompanies,
        List<ProductModuleInfoDto> productModules,
        List<FileInfoDto> rfpFiles
) {
    public static ProjectOpportunityResponse from(ProjectOpportunity entity, User createUser) {
        return new ProjectOpportunityResponse(
                entity.getId(),
                entity.getOpportunityCode(),
                entity.getOpportunityName(),
                entity.getStage(),
                entity.getProjectType(),
                entity.getExpectedBidDate(),
                entity.getExpectedBudget(),
                entity.getCustomerCompany() != null ? entity.getCustomerCompany().getId() : null,
                entity.getCustomerCompany() != null ? entity.getCustomerCompany().getName() : null,
                entity.getSalesRepresentative() != null ? entity.getSalesRepresentative().getId().toString() : null,
                entity.getSalesRepresentative() != null ? entity.getSalesRepresentative().getName() : null,
                entity.getCreatedBy(),
                createUser != null ? createUser.getName() : "알 수 없음",
                entity.getDescription(),
                entity.getCompetitionStatus(),

                entity.getPartnerCompanies().stream().map(PartnerCompanyInfoDto::from).toList(),
                entity.getProductModules().stream().map(ProductModuleInfoDto::from).toList(),
                entity.getRfpFiles().stream().map(FileInfoDto::from).toList()
        );
    }
}