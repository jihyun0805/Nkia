package com.nkia.Orbis.domain.admin.permission.repository;

import com.nkia.Orbis.domain.admin.permission.entity.Permission;
import com.nkia.Orbis.domain.admin.permission.entity.PermissionAction;
import com.nkia.Orbis.domain.admin.permission.entity.PermissionDomain;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, Long> {

    Optional<Permission> findByDomainAndAction(
            PermissionDomain domain,
            PermissionAction action
    );
}
