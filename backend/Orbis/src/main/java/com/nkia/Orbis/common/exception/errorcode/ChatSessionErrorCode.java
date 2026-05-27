package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ChatSessionErrorCode implements ErrorCode {
    SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "CHAT_0001", "챗봇 세션을 찾을 수 없습니다."),
    SESSION_OWNER_KEY_REQUIRED(HttpStatus.BAD_REQUEST, "CHAT_0002", "챗봇 세션 식별 키가 필요합니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
