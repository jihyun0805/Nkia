package com.nkia.Orbis.domain.company.dto.request;

import com.nkia.Orbis.domain.company.entity.CompanyCategory;
import com.nkia.Orbis.domain.company.entity.Sector;
import jakarta.validation.constraints.NotBlank;

public record CompanyUpdateRequest(
        @NotBlank(message = "회사명은 필수입니다.")
        String name,
        Sector sector,
        CompanyCategory category,
        String address
) {
}
