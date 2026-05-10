package com.nkia.Orbis.domain.admin.permission.repository;

import com.nkia.Orbis.domain.admin.permission.entity.Role;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
}
