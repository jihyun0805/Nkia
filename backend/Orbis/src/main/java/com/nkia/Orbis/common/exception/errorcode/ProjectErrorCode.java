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
    PROJECT_ALREADY_REGISTERED(HttpStatus.BAD_REQUEST, "PROJECT_0004", "이미 사업으로 등록된 수주보고서입니다."),
    PROJECT_NOT_FOUND(HttpStatus.NOT_FOUND, "PROJECT_0005", "요청한 사업을 찾을 수 없습니다."),
    RESULT_REPORT_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "PROJECT_0006", "이미 결과보고서가 등록된 사업입니다."),
    BILLING_NOT_FOUND(HttpStatus.NOT_FOUND, "PROJECT_0007", "요청한 청구건을 찾을 수 없습니다."),
    BILLING_NOT_APPROVED(HttpStatus.BAD_REQUEST, "PROJECT_0008", "승인된 청구건만 발행할 수 있습니다."),
    COLLECTION_NOT_APPROVED(HttpStatus.BAD_REQUEST, "PROJECT_0009", "세금계산서가 발행된 건만 수금할 수 있습니다."),
    RESULT_REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "PROJECT_0010", "요청한 결과보고서를 찾을 수 없습니다."),
    BILLING_ALREADY_ISSUED(HttpStatus.BAD_REQUEST, "PROJECT_0011", "이미 발행된 청구건입니다."),
    BILLING_ALREADY_COLLECTED(HttpStatus.BAD_REQUEST, "PROJECT_0012", "이미 수금 완료된 청구건입니다."),
    INVALID_BILLING_STATUS(HttpStatus.BAD_REQUEST, "PROJECT_0013",
            "유효하지 않은 billing status 입니다.");
    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
