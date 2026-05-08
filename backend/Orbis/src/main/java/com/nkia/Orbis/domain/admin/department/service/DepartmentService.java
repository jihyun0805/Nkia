package com.nkia.Orbis.domain.admin.department.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.DepartmentErrorCode;
import com.nkia.Orbis.domain.admin.department.dto.request.DepartmentRequest;
import com.nkia.Orbis.domain.admin.department.dto.response.DepartmentResponse;
import com.nkia.Orbis.domain.admin.department.entity.Department;
import com.nkia.Orbis.domain.admin.department.repository.DepartmentRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DepartmentService {
    private final DepartmentRepository departmentRepository;

    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {

        if (departmentRepository.existsByHeadquartersAndTeam(
                request.getHeadquarters(),
                request.getTeam()
        )) {
            throw new ApiException(DepartmentErrorCode.DEPARTMENT_EXISTS);
        }

        Department department = Department.create(
                request.getHeadquarters(),
                request.getTeam()
        );

        Department saved = departmentRepository.save(department);

        return DepartmentResponse.from(saved);
    }

    @Transactional
    public List<DepartmentResponse> getDepartments() {
        return departmentRepository.findAll()
                .stream()
                .map(DepartmentResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long departmentId) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ApiException(DepartmentErrorCode.DEPARTMENT_NOT_FOUND));

        department.delete();
    }
}