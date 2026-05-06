package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CompanyManagerErrorCode implements ErrorCode {
    COMPANY_MANAGER_EXISTS_EMAIL(HttpStatus.BAD_REQUEST, "COMPANY_MANAGER_0001", "이미 존재하는 담당자 email입니다."),
    COMPANY_MANAGER_NOT_FOUND(HttpStatus.NOT_FOUND, "COMPANY_MANAGER_0002", "존재하지 않는 담당자 ID입니다.");
    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}