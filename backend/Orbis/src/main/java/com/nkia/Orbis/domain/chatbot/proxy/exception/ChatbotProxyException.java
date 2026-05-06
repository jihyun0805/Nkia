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
