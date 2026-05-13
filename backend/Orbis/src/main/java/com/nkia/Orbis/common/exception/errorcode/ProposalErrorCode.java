package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ProposalErrorCode implements ErrorCode {
    PROPOSAL_NOT_FOUND(HttpStatus.NOT_FOUND, "PROPOSAL_0001", "존재하지 않는 제안서 ID입니다."),
    PROPOSAL_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "PROPOSAL_0002", "사업 기회에 이미 제안서가 존재합니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
