// 인수인계: AI 프록시 호출 실패를 공통 ApiException 형태로 감싸기 위한 예외입니다.
// 핵심 흐름: AI 서버의 4xx/5xx를 백엔드 공통 에러 코드와 메시지로 변환할 때 사용됩니다.
// 같이 확인: 에러 포맷 변경 시 ChatbotProxyService.mapUpstreamException을 같이 확인하세요.
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
