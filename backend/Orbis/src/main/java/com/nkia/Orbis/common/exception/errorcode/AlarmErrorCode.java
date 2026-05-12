package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AlarmErrorCode implements ErrorCode {
    ALARM_ACCESS_DENIED(HttpStatus.UNAUTHORIZED, "ALARM_0001", "자신의 알람만 열람할 수 있습니다."),
    ALARM_NOT_FOUND(HttpStatus.NOT_FOUND, "ALARM_0002", "존재하지 않는 알람 ID입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}