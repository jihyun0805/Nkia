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
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("!no-seed")
@RequiredArgsConstructor
@Order(3)
public class UserInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String ADMIN_EMAIL = "admin@admin.com";
    private static final String ADMIN_EMPLOYEE_NUMBER = "ADMIN001";

    @Override
    @Transactional
    public void run(String... args) {

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> roleRepository.save(Role.create("ADMIN")));

        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(Role.create("USER")));

        Department department = departmentRepository
                .findByHeadquartersAndTeam("경영지원본부", "경영지원팀")
                .orElseGet(() -> departmentRepository.save(
                        Department.create("경영지원본부", "경영지원팀")
                ));

        createAdminIfNotExists(adminRole, department);

        createUserIfNotExists(
                "USER001",
                "member@orbis.com",
                "팀원",
                Position.TEAM_MEMBER,
                userRole,
                department
        );

        createUserIfNotExists(
                "USER002",
                "leader@orbis.com",
                "팀장",
                Position.TEAM_LEADER,
                userRole,
                department
        );

        createUserIfNotExists(
                "USER003",
                "director@orbis.com",
                "본부장",
                Position.HEAD_DIRECTOR,
                userRole,
                department
        );
    }

    private void createAdminIfNotExists(Role adminRole, Department department) {
        if (userRepository.existsByEmail(ADMIN_EMAIL)
                || userRepository.existsByEmployeeNumber(ADMIN_EMPLOYEE_NUMBER)) {
            return;
        }

        User admin = User.createUser(
                ADMIN_EMPLOYEE_NUMBER,
                Position.HEAD_DIRECTOR,
                "관리자",
                "010-0000-0000",
                ADMIN_EMAIL,
                passwordEncoder.encode("admin"),
                Set.of(adminRole),
                Status.ACTIVE,
                department
        );

        userRepository.save(admin);
    }

    private void createUserIfNotExists(
            String employeeNumber,
            String email,
            String name,
            Position position,
            Role role,
            Department department
    ) {
        if (userRepository.existsByEmail(email)
                || userRepository.existsByEmployeeNumber(employeeNumber)) {
            return;
        }

        User user = User.createUser(
                employeeNumber,
                position,
                name,
                "010-0000-0000",
                email,
                passwordEncoder.encode("1234"),
                Set.of(role),
                Status.ACTIVE,
                department
        );

        userRepository.save(user);
    }
}
