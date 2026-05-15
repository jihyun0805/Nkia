package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum PrbErrorCode implements ErrorCode {
    PRB_NOT_FOUND(HttpStatus.NOT_FOUND, "PRB_0001", "존재하지 않는 PRB ID입니다."),
    PRB_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "PRB_0002", "사업 기회에 이미 PRB가 존재합니다."),
    INVALID_PRB_STATUS(HttpStatus.BAD_REQUEST, "PRB_0003",
            "유효하지 않은 prb status 입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
