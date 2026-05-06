package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ContractErrorCode implements ErrorCode {
    CONTRACT_SUMMARY_NOT_FOUND(HttpStatus.NOT_FOUND, "CONTRACT_0001",
            "요청한 contract summary를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
