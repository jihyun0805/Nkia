package com.nkia.Orbis.common.util;

import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtil {
    public static String getAuthenticatedUserIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) {
            return null;
        }

        if (principal instanceof UUID) {
            return principal.toString();
        }

        return principal.toString();
    }

    public static String getCurrentUserId() {
        String authenticatedUserId = getAuthenticatedUserIdOrNull();
        if (authenticatedUserId == null) {
            return "SYSTEM";
        }
        return authenticatedUserId;
    }
}
