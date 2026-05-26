// 인수인계 메모: 챗봇 프록시 계층입니다. 프론트 요청을 받아 사용자 권한 컨텍스트를 조립하고 AI 서버로 전달합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.exception;

import com.nkia.Orbis.common.exception.errorcode.ErrorCode;
import lombok.Getter;

@Getter
public class ChatbotProxyException extends RuntimeException {

    private final ErrorCode errorCode;

    public ChatbotProxyException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
