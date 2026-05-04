package com.nkia.Orbis.common.util;

import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtil {
    public static String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // 1. 인증 정보가 없거나 익명 사용자일 경우
        if (authentication == null || !authentication.isAuthenticated() ||
                authentication.getPrincipal().equals("anonymousUser")) {
            return "SYSTEM";
        }

        Object principal = authentication.getPrincipal();

        // 2. Principal이 UUID 객체인 경우 (기존 JpaAuditConfig 로직)
        if (principal instanceof UUID) {
            return principal.toString();
        }

        // 3. Principal이 Long 타입이거나 다른 타입(String 등)인 경우
        // toString()을 호출하여 모두 String 타입으로 변환하여 반환
        return principal.toString();
    }
}