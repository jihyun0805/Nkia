// 인수인계 메모: 채팅 세션/메시지 저장 계층입니다. 사용자별 대화 목록과 메시지 이력을 DB에 보존합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
