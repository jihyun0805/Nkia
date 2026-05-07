package com.nkia.Orbis.domain.admin.department.service;

import com.nkia.Orbis.domain.admin.department.dto.request.DepartmentRequest;
import com.nkia.Orbis.domain.admin.department.dto.response.DepartmentResponse;
import com.nkia.Orbis.domain.admin.department.entity.Department;
import com.nkia.Orbis.domain.admin.department.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DepartmentService {
    private final DepartmentRepository departmentRepository;

    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        Department department = Department.create(
                request.getHeadquarters(),
                request.getTeam()
        );

        Department saved = departmentRepository.save(department);

        return DepartmentResponse.from(saved);
    }
}