package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ContractErrorCode implements ErrorCode {
    CONTRACT_SUMMARY_NOT_FOUND(HttpStatus.NOT_FOUND, "CONTRACT_0001",
            "요청한 contract summary를 찾을 수 없습니다."),
    ORDER_REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "CONTRACT_0002",
            "요청한 order report를 찾을 수 없습니다."),
    LICENSE_NOT_FOUND(HttpStatus.NOT_FOUND, "CONTRACT_0003",
            "요청한 license를 찾을 수 없습니다."),
    LICENSE_UPDATE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "CONTRACT_0004",
            "수주보고서와 연결된 라이선스는 라이선스 화면에서 수정할 수 없습니다. 수주보고서를 수정해주세요."),
    ORDER_REPORT_HISTORY_NOT_FOUND(HttpStatus.NOT_FOUND, "CONTRACT_0005",
            "요청한 order report history를 찾을 수 없습니다."),
    INVALID_ORDER_REPORT_STATUS(HttpStatus.BAD_REQUEST, "CONTRACT_0006",
            "유효하지 않은 order report status 입니다."),
    INVALID_LICENSE_STATUS(HttpStatus.BAD_REQUEST, "CONTRACT_0007",
            "유효하지 않은 license status 입니다."),
    ORDER_REPORT_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "CONTRACT_0008",
            "사업 기회에 이미 수주보고서가 존재합니다."),
    INVALID_CONTRACT_STATUS(HttpStatus.BAD_REQUEST, "CONTRACT_0009",
            "유효하지 않은 contract status 입니다.");


    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
