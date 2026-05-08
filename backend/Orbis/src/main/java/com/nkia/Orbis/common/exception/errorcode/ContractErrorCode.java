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
    LICENSE_UPDATE_NOT_ALLOWED(HttpStatus.NOT_FOUND, "CONTRACT_0004",
            "수주보고서와 연결된 라이선스는 라이선스 화면에서 수정할 수 없습니다. 수주보고서를 수정해주세요.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
