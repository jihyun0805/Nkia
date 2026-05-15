package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum PrbResultErrorCode implements ErrorCode {

    PRB_RESULT_NOT_FOUND(HttpStatus.NOT_FOUND, "PRB_RESULT_0001", "존재하지 않는 PRB RESULT ID입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
