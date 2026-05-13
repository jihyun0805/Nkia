package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum MaintenanceErrorCode implements ErrorCode {
    QUOTATION_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "MAINTENANCE_0001", "이미 등록된 견적서 참조번호입니다."),
    MODULE_NOT_FOUND(HttpStatus.NOT_FOUND, "MAINTENANCE_0002", "요청한 제품 모듈을 찾을 수 없습니다."),
    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "MAINTENANCE_0003", "존재하지 않는 서비스 구분입니다."),
    ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "MAINTENANCE_0004", "존재하지 않는 서비스 항목입니다."),
    SUPPORT_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "MAINTENANCE_0005", "존재하지 않는 고객지원 요청입니다."),
    MAINTENANCE_NOT_FOUND(HttpStatus.NOT_FOUND, "MAINTENANCE_0006", "해당 유지보수 정보를 찾을 수 없습니다."),
    ACTIVITY_NOT_FOUND(HttpStatus.NOT_FOUND, "MAINTENANCE_0007", "해당 고객지원 활동 결과를 찾을 수 없습니다."),
    QUOTATION_NOT_FOUND(HttpStatus.NOT_FOUND, "MAINTENANCE_0008", "해당 유지보수 견적서를 찾을 수 없습니다."),
    INVALID_CS_REQUEST_STATUS(HttpStatus.BAD_REQUEST, "MAINTENANCE_0009",
            "유효하지 않은 CS request status 입니다."),
    INVALID_MAINTENANCE_STATUS(HttpStatus.BAD_REQUEST, "MAINTENANCE_0010",
            "유효하지 않은 maintenance status 입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
