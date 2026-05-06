package com.nkia.Orbis.domain.company.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CompanyManagerUpdateRequest(
        @NotBlank(message = "담당자 이름은 필수입니다.")
        String name,
        String mobilePhone,
        String officePhone,
        String department,
        String position,
        String role
        // 이메일은 Unique 키이므로 식별자로 사용되거나 변경 불가능한 정책으로 두는 것이 안전합니다.
) {
}