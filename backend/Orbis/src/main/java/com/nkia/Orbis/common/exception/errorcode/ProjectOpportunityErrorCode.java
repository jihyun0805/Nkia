package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ProjectOpportunityErrorCode implements ErrorCode {
    EXISTS_PROJECT_OPPORTUNITY_CODE(HttpStatus.BAD_REQUEST, "PROJECT_OPPORTUNITY_0001", "이미 존재하는 사업기회 코드입니다."),
    PROJECT_OPPORTUNITY_NOT_FOUND(HttpStatus.NOT_FOUND, "PROJECT_OPPORTUNITY_0002", "존재하지 않는 사업기회입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}