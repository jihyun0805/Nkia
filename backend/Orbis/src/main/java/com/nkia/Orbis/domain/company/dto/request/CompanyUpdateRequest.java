package com.nkia.Orbis.domain.company.dto.request;

import com.nkia.Orbis.domain.company.entity.CompanyCategory;
import com.nkia.Orbis.domain.company.entity.CompanyType;
import com.nkia.Orbis.domain.company.entity.Sector;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CompanyUpdateRequest(
        @NotNull(message = "회사 구분(고객사/협력사)은 필수입니다.")
        CompanyType companyType,

        @NotBlank(message = "회사명은 필수입니다.")
        String name,
        Sector sector,
        CompanyCategory category,
        String address,
        String memo
) {
}
