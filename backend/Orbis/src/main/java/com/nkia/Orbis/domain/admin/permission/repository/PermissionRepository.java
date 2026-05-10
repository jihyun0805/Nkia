package com.nkia.Orbis.domain.admin.permission.repository;

import com.nkia.Orbis.domain.admin.permission.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
}
