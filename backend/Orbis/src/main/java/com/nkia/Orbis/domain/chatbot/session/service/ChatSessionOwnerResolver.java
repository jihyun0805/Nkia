// 인수인계: 현재 요청의 챗봇 세션 ownerId를 결정하는 헬퍼입니다.
// 핵심 흐름: 로그인 사용자 id를 우선 사용하고, 필요 시 익명 세션 기준을 만들어 세션을 분리합니다.
// 같이 확인: 인증 방식 변경 시 SecurityUtil 사용부와 세션 repository 조회 조건을 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.session.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ChatSessionErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class ChatSessionOwnerResolver {

    public String resolveCurrentOwnerId() {
        String authenticatedUserId = SecurityUtil.getAuthenticatedUserIdOrNull();
        if (StringUtils.hasText(authenticatedUserId)) {
            return authenticatedUserId;
        }
        throw new ApiException(ChatSessionErrorCode.SESSION_OWNER_KEY_REQUIRED);
    }
}
