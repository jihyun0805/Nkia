package com.nkia.Orbis.domain.company.dto.response;

import com.nkia.Orbis.domain.company.entity.CompanyManager;
import lombok.Builder;

@Builder
public record CompanyManagerResponse(
        Long id,
        Long companyId,
        String companyName,
        String name,
        String email,
        String mobilePhone,
        String officePhone,
        String department,
        String position,
        String role
) {
    // Entity -> DTO 변환 팩토리 메서드
    public static CompanyManagerResponse from(CompanyManager manager) {
        return CompanyManagerResponse.builder()
                .id(manager.getId())
                .companyId(manager.getCompany().getId())
                .companyName(manager.getCompany().getName())
                .name(manager.getName())
                .email(manager.getEmail())
                .mobilePhone(manager.getMobilePhone())
                .officePhone(manager.getOfficePhone())
                .department(manager.getDepartment())
                .position(manager.getPosition())
                .role(manager.getRole())
                .build();
    }
}