package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ProjectErrorCode implements ErrorCode {
    ORDER_REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "PROJECT_0001", "요청한 수주 보고서를 찾을 수 없습니다."),
    INVALID_PROJECT_CODE(HttpStatus.BAD_REQUEST, "PROJECT_0002", "유효하지 않은 사업 코드입니다."),
    MANAGER_NOT_FOUND(HttpStatus.BAD_REQUEST, "PROJECT_0003", "담당자를 찾을 수 없습니다."),
    PROJECT_ALREADY_REGISTERED(HttpStatus.BAD_REQUEST, "PROJECT_0004", "이미 사업으로 등록된 수주보고서입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
