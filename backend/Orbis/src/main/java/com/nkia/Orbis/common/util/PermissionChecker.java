package com.nkia.Orbis.common.util;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("permissionChecker")
@RequiredArgsConstructor
public class PermissionChecker {

    private final UserRepository userRepository;

    public boolean hasPermission(
            Authentication authentication,
            String domain,
            String action
    ) {
        UUID userId = UUID.fromString(authentication.getName());

        User user = userRepository.findById(userId)
                .orElseThrow();

        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(permission ->
                        permission.getDomain().name().equals(domain)
                                && permission.getAction().name().equals(action)
                );
    }
}