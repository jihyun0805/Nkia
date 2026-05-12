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
