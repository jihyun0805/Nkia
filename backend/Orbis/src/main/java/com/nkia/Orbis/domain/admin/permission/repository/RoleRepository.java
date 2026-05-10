package com.nkia.Orbis.domain.admin.permission.repository;

import com.nkia.Orbis.domain.admin.permission.entity.Role;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);

    @Query("""
            SELECT DISTINCT r
            FROM Role r
            LEFT JOIN FETCH r.permissions
            WHERE r.id = :roleId
            """)
    Optional<Role> findByIdWithPermissions(@Param("roleId") Long roleId);
}
