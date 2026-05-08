package com.nkia.Orbis.domain.admin.department.dto.response;

import com.nkia.Orbis.domain.admin.department.entity.Department;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DepartmentResponse {

    private Long id;

    private String headquarters;

    private String team;

    public static DepartmentResponse from(Department department) {
        return DepartmentResponse.builder()
                .id(department.getId())
                .headquarters(department.getHeadquarters())
                .team(department.getTeam())
                .build();
    }
}