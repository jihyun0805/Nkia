package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ProductModuleErrorCode implements ErrorCode {
    PRODUCT_MODULE_NOT_FOUND(HttpStatus.NOT_FOUND, "PRODUCT_MODULE_0001",
            "요청한 product module을 찾을 수 없습니다.");
    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}