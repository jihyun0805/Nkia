package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CompanyErrorCode implements ErrorCode {
    COMPANY_NOT_FOUND(HttpStatus.NOT_FOUND, "COMPANY_0001", "존재하지 않는 회사 ID입니다.");
    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}