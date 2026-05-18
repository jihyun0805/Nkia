package com.nkia.Orbis.domain.company.dto.response;

import com.nkia.Orbis.domain.company.entity.Company;
import lombok.Builder;

@Builder
public record CompanyResponse(
        Long id,
        String companyType,
        String code,
        String name,
        String businessRegistrationNumber,
        String sector,
        String category,
        String address,
        String memo
) {
    public static CompanyResponse from(Company company) {
        return CompanyResponse.builder()
                .id(company.getId())
                .companyType(company.getCompanyType() != null ? company.getCompanyType().name() : null)
                .code(company.getCode())
                .name(company.getName())
                .businessRegistrationNumber(company.getBusinessRegistrationNumber())
                .sector(company.getSector() != null ? company.getSector().name() : null)
                .category(company.getCategory() != null ? company.getCategory().name() : null)
                .address(company.getAddress())
                .memo(company.getMemo())
                .build();
    }
}
