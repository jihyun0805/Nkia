package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum BidResultErrorCode implements ErrorCode {
    BID_RESULT_NOT_FOUND(HttpStatus.NOT_FOUND, "BID_RESULT_0001", "존재하지 않는 입찰 결과 ID입니다."),
    BID_RESULT_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "BID_RESULT_0002", "사업 기회에 이미 입찰 결과가 존재합니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
