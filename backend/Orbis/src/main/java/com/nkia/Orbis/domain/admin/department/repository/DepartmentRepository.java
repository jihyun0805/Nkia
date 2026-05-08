package com.nkia.Orbis.domain.admin.department.repository;

import com.nkia.Orbis.domain.admin.department.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    boolean existsByHeadquartersAndTeam(String headquarters, String team);
}
