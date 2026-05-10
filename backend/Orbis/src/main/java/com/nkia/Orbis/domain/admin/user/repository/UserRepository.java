package com.nkia.Orbis.domain.admin.user.repository;

import com.nkia.Orbis.domain.admin.permission.entity.Role;
import com.nkia.Orbis.domain.admin.user.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByEmployeeNumber(String employeeNumber);

    @Query("""
                SELECT DISTINCT u
                FROM User u
                LEFT JOIN FETCH u.roles r
                LEFT JOIN FETCH r.permissions
                WHERE u.id = :userId
            """)
    Optional<User> findByIdWithRolesAndPermissions(@Param("userId") UUID userId);

    @Query("""
                SELECT DISTINCT u
                FROM User u
                JOIN u.roles r
                WHERE r = :role
            """)
    List<User> findByRole(@Param("role") Role role);
}
