package com.nkia.Orbis.domain.company.dto.request;

import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyManager;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CompanyManagerCreateRequest(
        @NotBlank(message = "담당자 이름은 필수입니다.")
        String name,

        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        String email,

        String mobilePhone,
        String officePhone,
        String department,
        String position,
        String role
) {
    public CompanyManager toEntity(Company company) {
        return CompanyManager.builder()
                .company(company)
                .name(this.name)
                .email(this.email)
                .mobilePhone(this.mobilePhone)
                .officePhone(this.officePhone)
                .department(this.department)
                .position(this.position)
                .role(this.role)
                .build();
    }
}
