package com.nkia.Orbis.domain.admin.user.init;

import com.nkia.Orbis.domain.admin.department.entity.Department;
import com.nkia.Orbis.domain.admin.department.repository.DepartmentRepository;
import com.nkia.Orbis.domain.admin.permission.entity.Role;
import com.nkia.Orbis.domain.admin.permission.repository.RoleRepository;
import com.nkia.Orbis.domain.admin.user.entity.Position;
import com.nkia.Orbis.domain.admin.user.entity.Status;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Order(3)
public class UserInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {

        if (userRepository.existsByEmail("admin@orbis.com")) {
            return;
        }

        // PermissionInitializer 에서 생성한 ADMIN Role 조회
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow();

        Department department = departmentRepository
                .findByHeadquartersAndTeam(
                        "경영지원본부",
                        "경영지원팀"
                )
                .orElseThrow();

        User admin = User.createUser(
                "ADMIN001",
                Position.HEAD_DIRECTOR,
                "관리자",
                "010-0000-0000",
                "admin@admin.com",
                passwordEncoder.encode("admin"),
                Set.of(adminRole),
                Status.ACTIVE,
                department
        );

        userRepository.save(admin);
    }
}
