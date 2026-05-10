package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ActivityErrorCode implements ErrorCode {
    SALES_ACTIVITY_NOT_FOUND(HttpStatus.NOT_FOUND, "ACTIVITY_0001",
            "요청한 sales activity를 찾을 수 없습니다."),
    SALES_ACTIVITY_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "ACTIVITY_0002",
            "요청한 sales activity request를 찾을 수 없습니다."),

    EXIST_SALES_ACTIVITY_REQUEST(HttpStatus.NOT_FOUND, "ACTIVITY_0003",
            "이미 존재하는 sales activity 입니다."),
    QUOTATION_NOT_FOUND(HttpStatus.NOT_FOUND, "ACTIVITY_0004",
            "요청한 quotation을 찾을 수 없습니다."),
    QUOTATION_CODE_GENERATION_FAILED(HttpStatus.CONFLICT, "ACTIVITY_0005",
            "견적 코드 생성에 실패했습니다."),
    QUOTATION_HISTORY_NOT_FOUND(HttpStatus.NOT_FOUND, "ACTIVITY_0006",
            "요청한 quotation history를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}


