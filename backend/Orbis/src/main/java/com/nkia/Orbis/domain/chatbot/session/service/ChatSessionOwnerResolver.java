package com.nkia.Orbis.domain.chatbot.session.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ChatSessionErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class ChatSessionOwnerResolver {

    public static final String CHATBOT_SESSION_KEY_HEADER = "X-Chatbot-Session-Key";
    private static final String ANONYMOUS_OWNER_PREFIX = "ANON:";

    private final HttpServletRequest request;

    public String resolveCurrentOwnerId() {
        String authenticatedUserId = SecurityUtil.getAuthenticatedUserIdOrNull();
        if (StringUtils.hasText(authenticatedUserId)) {
            return authenticatedUserId;
        }

        String anonymousOwnerKey = request.getHeader(CHATBOT_SESSION_KEY_HEADER);
        if (!StringUtils.hasText(anonymousOwnerKey)) {
            throw new ApiException(ChatSessionErrorCode.SESSION_OWNER_KEY_REQUIRED);
        }

        return ANONYMOUS_OWNER_PREFIX + anonymousOwnerKey.trim();
    }
}
