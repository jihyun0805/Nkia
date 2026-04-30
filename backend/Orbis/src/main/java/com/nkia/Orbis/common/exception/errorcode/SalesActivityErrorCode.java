package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum SalesActivityErrorCode implements ErrorCode {
    SALES_ACTIVITY_NOT_FOUND(HttpStatus.NOT_FOUND, "SALES_ACTIVITY_001",
            "요청한 sales activity를 찾을 수 없습니다."),
    SALES_ACTIVITY_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "SALES_ACTIVITY_0002",
            "요청한 sales activity request를 찾을 수 없습니다."),

    EXIST_SALES_ACTIVITY_REQUEST(HttpStatus.NOT_FOUND, "SALES_ACTIVITY_0003",
            "이미 존재하는 sales activity 입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}


