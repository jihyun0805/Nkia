package com.nkia.Orbis.domain.admin.permission.init;

import com.nkia.Orbis.domain.admin.permission.entity.Permission;
import com.nkia.Orbis.domain.admin.permission.entity.PermissionAction;
import com.nkia.Orbis.domain.admin.permission.entity.PermissionDomain;
import com.nkia.Orbis.domain.admin.permission.entity.Role;
import com.nkia.Orbis.domain.admin.permission.repository.PermissionRepository;
import com.nkia.Orbis.domain.admin.permission.repository.RoleRepository;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class PermissionInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;

    private static final Set<PermissionDomain> USER_DOMAINS = Set.of(
            PermissionDomain.PROJECT_OPPORTUNITY,
            PermissionDomain.COMPANY,
            PermissionDomain.SALES_ACTIVITY,
            PermissionDomain.SALES_ACTIVITY_REQUEST,
            PermissionDomain.QUOTATION,
            PermissionDomain.RFP_ANALYSE_RESULT,
            PermissionDomain.PRB,
            PermissionDomain.PRB_RESULT,
            PermissionDomain.BID_RESULT,
            PermissionDomain.ORDER_REPORT,
            PermissionDomain.CONTRACT,
            PermissionDomain.LICENSE,
            PermissionDomain.PROJECT,
            PermissionDomain.PROJECT_RESULT,
            PermissionDomain.BILLING,
            PermissionDomain.PROJECT_RESULT_REPORT,
            PermissionDomain.MAINTENANCE,
            PermissionDomain.MAINTENANCE_QUOTATION,
            PermissionDomain.CUSTOMER_SUPPORT,
            PermissionDomain.PRODUCT_MODULE
    );

    @Override
    @Transactional
    public void run(String... args) {
        initPermissions();
        initRoles();
    }

    private void initPermissions() {
        if (permissionRepository.count() > 0) {
            return;
        }

        for (PermissionDomain domain : PermissionDomain.values()) {
            for (PermissionAction action : PermissionAction.values()) {
                permissionRepository.save(Permission.create(domain, action));
            }
        }
    }

    private void initRoles() {
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> roleRepository.save(Role.create("ADMIN")));

        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(Role.create("USER")));

        Set<Permission> allPermissions = new HashSet<>(permissionRepository.findAll());

        Set<Permission> userPermissions = allPermissions.stream()
                .filter(permission -> USER_DOMAINS.contains(permission.getDomain()))
                .collect(Collectors.toSet());

        adminRole.changePermissions(allPermissions);
        userRole.changePermissions(userPermissions);
    }
}
