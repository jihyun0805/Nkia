package com.nkia.Orbis.domain.company.dto.request;

import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyCategory;
import com.nkia.Orbis.domain.company.entity.CompanyType;
import com.nkia.Orbis.domain.company.entity.Sector;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CompanyCreateRequest(
        @NotNull(message = "회사 구분(고객사/협력사)은 필수입니다.")
        CompanyType companyType,

        @NotBlank(message = "회사 코드는 필수입니다.")
        String code,

        @NotBlank(message = "회사명은 필수입니다.")
        String name,

        @NotBlank(message = "사업자등록번호는 필수입니다.")
        String businessRegistrationNumber,

        Sector sector,
        CompanyCategory category,
        String address,
        String memo
) {
    public Company toEntity() {
        return Company.builder()
                .companyType(this.companyType)
                .code(this.code)
                .name(this.name)
                .businessRegistrationNumber(this.businessRegistrationNumber)
                .sector(this.sector)
                .category(this.category)
                .address(this.address)
                .memo(this.memo)
                .build();
    }
}