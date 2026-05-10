package com.nkia.Orbis.common.util;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component("permissionChecker")
@RequiredArgsConstructor
public class PermissionChecker {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public boolean hasPermission(Authentication authentication, String domain, String action) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        UUID userId = (UUID) authentication.getPrincipal();

        User user = userRepository.findByIdWithRolesAndPermissions(userId)
                .orElse(null);

        if (user == null) {
            return false;
        }

        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(permission ->
                        permission.getDomain().name().equals(domain)
                                && permission.getAction().name().equals(action)
                );
    }
}